import type { BibleAPIProvider, ChapterData, VerseRequest, VerseResponse } from "../types";
import { BOOK_NUMBERS } from "@shared/constants";
import { formatReference } from "@shared/utils";

const BASE_URL = "https://bolls.life";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

async function fetchSingleVerse(
  translation: string,
  bookNum: number,
  chapter: number,
  verse: number
): Promise<string> {
  const url = `${BASE_URL}/get-verse/${translation}/${bookNum}/${chapter}/${verse}/`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch verse: ${response.statusText}`);
  }

  const data = await response.json();
  return stripHtml(data.text);
}

async function fetchChapter(
  translation: string,
  bookNum: number,
  chapter: number
): Promise<string> {
  const url = `${BASE_URL}/get-text/${translation}/${bookNum}/${chapter}/`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch chapter: ${response.statusText}`);
  }

  const data = await response.json();
  return data
    .map((v: { verse: number; text: string }) => `${v.verse} ${stripHtml(v.text)}`)
    .join(" ");
}

async function fetchVerseRange(
  translation: string,
  bookNum: number,
  chapter: number,
  verseStart: number,
  verseEnd: number
): Promise<string> {
  const verses = [];
  for (let v = verseStart; v <= verseEnd; v++) {
    verses.push(v);
  }

  const url = `${BASE_URL}/get-verses/`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        translation,
        book: bookNum,
        chapter,
        verses,
      },
    ]),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch verses: ${response.statusText}`);
  }

  const data = await response.json();
  // Response is nested array: [[verse1, verse2, ...]]
  const results = data[0] || [];
  // Include verse numbers for ranges
  return results
    .map(
      (v: { verse: number; text: string }) => `${v.verse} ${stripHtml(v.text)}`
    )
    .join(" ");
}

export const bollsProvider: BibleAPIProvider = {
  name: "bolls.life",

  async fetchVerse(
    request: VerseRequest,
    translation = "NKJV"
  ): Promise<VerseResponse> {
    const bookNum = BOOK_NUMBERS[request.book];
    if (!bookNum) {
      throw new Error(`Unknown book: ${request.book}`);
    }

    let text: string;

    if (
      request.verseStart &&
      request.verseEnd &&
      request.verseEnd > request.verseStart
    ) {
      text = await fetchVerseRange(
        translation,
        bookNum,
        request.chapter,
        request.verseStart,
        request.verseEnd
      );
    } else if (request.verseStart) {
      text = await fetchSingleVerse(
        translation,
        bookNum,
        request.chapter,
        request.verseStart
      );
    } else {
      text = await fetchChapter(translation, bookNum, request.chapter);
    }

    return {
      reference: formatReference(request),
      text,
      translation,
    };
  },

  async fetchVerses(
    requests: VerseRequest[],
    translation = "NKJV"
  ): Promise<VerseResponse[]> {
    if (requests.length === 0) return [];

    // Separate chapter requests from verse requests
    const chapterRequests: { index: number; req: VerseRequest }[] = [];
    const verseRequests: { index: number; req: VerseRequest }[] = [];

    requests.forEach((req, index) => {
      if (req.verseStart) {
        verseRequests.push({ index, req });
      } else {
        chapterRequests.push({ index, req });
      }
    });

    // Initialize results array
    const results: VerseResponse[] = new Array(requests.length);

    // Fetch full chapters individually
    await Promise.all(
      chapterRequests.map(async ({ index, req }) => {
        const bookNum = BOOK_NUMBERS[req.book];
        if (!bookNum) {
          throw new Error(`Unknown book: ${req.book}`);
        }
        const text = await fetchChapter(translation, bookNum, req.chapter);
        results[index] = {
          reference: formatReference(req),
          text,
          translation,
        };
      })
    );

    // Fetch verses in bulk if any
    if (verseRequests.length > 0) {
      const payload = verseRequests.map(({ req }) => {
        const bookNum = BOOK_NUMBERS[req.book];
        if (!bookNum) {
          throw new Error(`Unknown book: ${req.book}`);
        }
        const verses: number[] = [];
        const end = req.verseEnd || req.verseStart!;
        for (let v = req.verseStart!; v <= end; v++) {
          verses.push(v);
        }
        return {
          translation,
          book: bookNum,
          chapter: req.chapter,
          verses,
        };
      });

      const response = await fetch(`${BASE_URL}/get-verses/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch verses: ${response.statusText}`);
      }

      const data = await response.json();

      verseRequests.forEach(({ index, req }, i) => {
        const verseData = data[i] || [];
        const isRange = req.verseEnd && req.verseEnd > (req.verseStart || 0);
        const text = verseData
          .map((v: { verse: number; text: string }) =>
            isRange ? `${v.verse} ${stripHtml(v.text)}` : stripHtml(v.text)
          )
          .join(" ");

        results[index] = {
          reference: formatReference(req),
          text,
          translation,
        };
      });
    }

    return results;
  },

  async fetchChapter(
    book: string,
    chapter: number,
    translation = "NKJV"
  ): Promise<ChapterData> {
    const bookNum = BOOK_NUMBERS[book];
    if (!bookNum) {
      throw new Error(`Unknown book: ${book}`);
    }

    const url = `${BASE_URL}/get-text/${translation}/${bookNum}/${chapter}/`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch chapter: ${response.statusText}`);
    }

    const data = await response.json();
    const verses = data.map((v: { verse: number; text: string }) => ({
      verse: v.verse,
      text: stripHtml(v.text),
    }));

    return {
      book,
      chapter,
      verses,
      translation,
    };
  },
};
