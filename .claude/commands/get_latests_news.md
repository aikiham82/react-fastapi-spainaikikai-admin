Follow the sequence of instructions

## Phase 1 (parallel execution)
Use two different browser instances one per agent
- use `@agent-playwright-link-scrapper` agent to navigate to the first article in https://alphasignal.ai/archive, enter in the article, only extract all the href links from the summary and store in markdown
- use `@agent-playwright-link-scrapper` agent to navigate to the first article in https://aibreakfast.beehiiv.com/, enter in the article, and extract only the ai news, ai tools and ai research section links and store in markdown

## Phase 2 (parallel execution)
- read `latest_news_links/{source_folder}/*`
- instanciate a new `@agent-web-content-summarizer` per each file, process a file per agent processing each link

## Phase 3 (parallel execution)
- Read the summaries from `latest_news_links/{source_folder}/*`
- Instanciate in paraller `@agent-ai-news-curator` per each summary file-
- Each agent will store the selected items in the collection news in the uptodateai database