import { apikey, sequence_id, showBrowser } from "./config";
import { browser } from "@crawlora/browser";

export default async function ({ url }: { url: string }) {
  const formedData = url
    .trim()
    .split("\n")
    .map((v) => v.trim());

  const MAX_RETRIES = 3;

  await browser(
    async ({ page, wait, output, debug }) => {
      for await (const baseUrl of formedData) {
        let retries = 0;
        let isCorrectPage = false;

        while (retries < MAX_RETRIES && !isCorrectPage) {
          try {
            await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
            await wait(2);

            const jobData = await page.evaluate(() => {
              const jobs = document.querySelectorAll(
                "ul.jobs-search__results-list li"
              );

              if (jobs.length > 0) {
                return Array.from(jobs).map((job) => ({
                  title: job.querySelector("h3")?.textContent?.trim() || "",
                  company: job.querySelector("h4")?.textContent?.trim() || "",
                  location:
                    job
                      .querySelector(".job-search-card__location")
                      ?.textContent?.trim() || "",
                  time: job.querySelector("time")?.textContent?.trim() || "",
                  url: job.querySelector("a")?.href?.trim() || "",
                }));
              }
              return [];
            });
            if (jobData.length > 0) {
              isCorrectPage = true;
              await Promise.all(
                jobData.map(async (job) => {
                  await output.create({
                    sequence_id,
                    sequence_output: job,
                  });
                })
              );
            } else {
              debug("No jobs found, retrying...");
              retries++;
              await wait(5);
            }
          } catch (error: any) {
            debug(`Error encountered: ${error.message}. Retrying...`);
            retries++;
            await wait(5);
          }

          if (retries >= MAX_RETRIES) {
            debug(`Max retries reached. Moving on from URL: ${baseUrl}`);
          }
        }
        await wait(3);
        debug(`Finished scraping for URL: ${baseUrl}`);
      }
    },
    { showBrowser, apikey }
  );
}
