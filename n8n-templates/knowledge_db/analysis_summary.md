# n8n Workflow Template Knowledge Database

**Generated from 8,258 workflow templates**
**899 unique node types discovered**

---

## Table of Contents
1. [Workflow Statistics](#workflow-statistics)
2. [Top Node Types](#top-node-types)
3. [Trigger Nodes](#trigger-nodes)
4. [AI/LLM Nodes](#aillm-nodes)
5. [Most Common Connection Patterns](#most-common-connection-patterns)
6. [Workflow Archetypes](#workflow-archetypes)
7. [Node Type Reference](#node-type-reference)

---

## Workflow Statistics

- **Total templates analyzed**: 8,258
- **Unique node types**: 899
- **Average nodes per workflow**: 14.7
- **Median nodes per workflow**: 12

### Complexity Distribution

| Size | Count | % |
|------|-------|---|
| complex (30+) | 629 | 7.6% |
| large (16-30) | 1,997 | 24.2% |
| medium (8-15) | 3,478 | 42.1% |
| small (4-7) | 1,676 | 20.3% |
| tiny (1-3) | 478 | 5.8% |

---

## Top Node Types

### By Usage Count (top 50)

| # | Node Type | Uses | In Workflows | Category |
|---|-----------|------|--------------|----------|
| 1 | `httpRequest` | 11,155 | 4,077 | built-in |
| 2 | `code` | 10,106 | 3,920 | built-in |
| 3 | `set` | 9,704 | 4,197 | built-in |
| 4 | `if` | 6,201 | 3,419 | built-in |
| 5 | `googleSheets` | 5,656 | 2,490 | built-in |
| 6 | `agent` | 4,329 | 2,809 | ai |
| 7 | `lmChatOpenAi` | 3,339 | 2,040 | ai |
| 8 | `telegram` | 2,602 | 1,058 | built-in |
| 9 | `gmail` | 2,403 | 1,495 | built-in |
| 10 | `merge` | 2,381 | 1,605 | built-in |
| 11 | `scheduleTrigger` | 2,360 | 2,102 | built-in |
| 12 | `wait` | 2,171 | 1,376 | built-in |
| 13 | `manualTrigger` | 2,039 | 2,039 | built-in |
| 14 | `outputParserStructured` | 1,963 | 1,362 | ai |
| 15 | `splitInBatches` | 1,887 | 1,479 | built-in |
| 16 | `googleDrive` | 1,862 | 964 | built-in |
| 17 | `openAi` | 1,714 | 1,060 | ai |
| 18 | `webhook` | 1,615 | 1,349 | built-in |
| 19 | `splitOut` | 1,614 | 1,080 | built-in |
| 20 | `slack` | 1,493 | 965 | built-in |
| 21 | `switch` | 1,490 | 1,102 | built-in |
| 22 | `lmChatGoogleGemini` | 1,352 | 821 | ai |
| 23 | `noOp` | 1,175 | 738 | built-in |
| 24 | `aggregate` | 1,169 | 842 | built-in |
| 25 | `respondToWebhook` | 1,160 | 635 | built-in |
| 26 | `chainLlm` | 1,149 | 737 | ai |
| 27 | `filter` | 1,125 | 733 | built-in |
| 28 | `airtable` | 1,087 | 350 | built-in |
| 29 | `memoryBufferWindow` | 1,067 | 858 | ai |
| 30 | `httpRequestTool` | 1,055 | 240 | built-in |
| 31 | `formTrigger` | 873 | 846 | built-in |
| 32 | `extractFromFile` | 699 | 505 | built-in |
| 33 | `lmChatOpenRouter` | 686 | 387 | ai |
| 34 | `postgres` | 659 | 186 | built-in |
| 35 | `chatTrigger` | 636 | 636 | ai |
| 36 | `emailSend` | 633 | 447 | built-in |
| 37 | `notion` | 608 | 257 | built-in |
| 38 | `telegramTrigger` | 595 | 589 | built-in |
| 39 | `function` | 589 | 317 | built-in |
| 40 | `toolWorkflow` | 569 | 223 | ai |
| 41 | `dataTable` | 554 | 139 | built-in |
| 42 | `executeWorkflowTrigger` | 449 | 449 | built-in |
| 43 | `googleSheetsTool` | 447 | 207 | built-in |
| 44 | `convertToFile` | 446 | 348 | built-in |
| 45 | `embeddingsOpenAi` | 441 | 263 | ai |
| 46 | `limit` | 380 | 293 | built-in |
| 47 | `html` | 377 | 266 | built-in |
| 48 | `supabase` | 376 | 113 | built-in |
| 49 | `rssFeedRead` | 360 | 149 | built-in |
| 50 | `executeWorkflow` | 335 | 205 | built-in |

---

## Trigger Nodes

| Trigger | Count | Common Next Nodes |
|---------|-------|-------------------|
| `lmChatOpenAi` | 3556 | `agent` (2454), `chainLlm` (446), `agentTool` (181) |
| `scheduleTrigger` | 2396 | `set` (575), `httpRequest` (490), `googleSheets` (464) |
| `manualTrigger` | 1784 | `set` (657), `googleSheets` (367), `httpRequest` (299) |
| `webhook` | 1547 | `set` (492), `code` (244), `httpRequest` (164) |
| `outputParserStructured` | 1721 | `agent` (1178), `chainLlm` (389), `outputParserAutofixing` (122) |
| `lmChatGoogleGemini` | 1504 | `agent` (835), `chainLlm` (321), `outputParserStructured` (111) |
| `memoryBufferWindow` | 1116 | `agent` (1010), `agentTool` (55), `memoryManager` (23) |
| `httpRequestTool` | 1052 | `mcpTrigger` (582), `agent` (374), `agentTool` (90) |
| `formTrigger` | 845 | `httpRequest` (211), `set` (202), `code` (88) |
| `lmChatOpenRouter` | 783 | `agent` (446), `chainLlm` (210), `outputParserStructured` (56) |
| `chatTrigger` | 618 | `agent` (375), `set` (86), `chainLlm` (24) |
| `telegramTrigger` | 618 | `if` (121), `switch` (106), `set` (105) |
| `toolWorkflow` | 565 | `agent` (449), `mcpTrigger` (95), `agentTool` (16) |
| `executeWorkflowTrigger` | 436 | `set` (128), `httpRequest` (59), `agent` (52) |
| `embeddingsOpenAi` | 479 | `vectorStorePinecone` (147), `vectorStoreSupabase` (138), `vectorStoreQdrant` (87) |
| `googleSheetsTool` | 442 | `agent` (349), `agentTool` (42), `mcpTrigger` (42) |
| `googleCalendarTool` | 312 | `agent` (199), `mcpTrigger` (74), `agentTool` (34) |
| `gmailTrigger` | 285 | `set` (50), `gmail` (42), `code` (40) |
| `gmailTool` | 293 | `agent` (167), `mcpTrigger` (86), `agentTool` (37) |
| `lmChatAnthropic` | 290 | `agent` (211), `chainLlm` (46), `agentTool` (16) |

---

## AI/LLM Nodes

| Node | Uses | Workflows | Common Connections |
|------|------|-----------|-------------------|
| `agent` | 4,329 | 2,809 | `code`, `set`, `agent` |
| `lmChatOpenAi` | 3,339 | 2,040 | `agent`, `chainLlm`, `agentTool` |
| `outputParserStructured` | 1,963 | 1,362 | `agent`, `chainLlm`, `outputParserAutofixing` |
| `openAi` | 1,714 | 1,060 | `code`, `set`, `httpRequest` |
| `lmChatGoogleGemini` | 1,352 | 821 | `agent`, `chainLlm`, `outputParserStructured` |
| `chainLlm` | 1,149 | 737 | `code`, `set`, `httpRequest` |
| `memoryBufferWindow` | 1,067 | 858 | `agent`, `agentTool`, `memoryManager` |
| `lmChatOpenRouter` | 686 | 387 | `agent`, `chainLlm`, `outputParserStructured` |
| `chatTrigger` | 636 | 636 | `agent`, `set`, `chainLlm` |
| `toolWorkflow` | 569 | 223 | `agent`, `mcpTrigger`, `agentTool` |
| `embeddingsOpenAi` | 441 | 263 | `vectorStorePinecone`, `vectorStoreSupabase`, `vectorStoreQdrant` |
| `mcpTrigger` | 318 | 289 |  |
| `documentDefaultDataLoader` | 304 | 285 | `vectorStorePinecone`, `vectorStoreSupabase`, `vectorStoreQdrant` |
| `lmChatAnthropic` | 282 | 186 | `agent`, `chainLlm`, `agentTool` |
| `googleGemini` | 269 | 186 | `code`, `set`, `agent` |
| `agentTool` | 254 | 69 | `agent`, `agentTool` |
| `toolHttpRequest` | 237 | 78 | `agent`, `mcpTrigger`, `openAi` |
| `toolThink` | 233 | 174 | `agent`, `agentTool`, `openAi` |
| `informationExtractor` | 231 | 187 | `merge`, `set`, `code` |
| `vectorStorePinecone` | 217 | 116 | `agent`, `toolVectorStore`, `splitInBatches` |
| `textSplitterRecursiveCharacterTextSplitter` | 197 | 185 | `documentDefaultDataLoader`, `chainSummarization` |
| `lmChatAzureOpenAi` | 172 | 124 | `agent`, `chainLlm`, `sentimentAnalysis` |
| `vectorStoreSupabase` | 165 | 88 | `agent`, `toolVectorStore`, `splitInBatches` |
| `mcpClientTool` | 156 | 114 | `agent`, `agentTool`, `openAi` |
| `openAi` | 152 | 85 | `code`, `openAi`, `function` |
| `toolCalculator` | 150 | 116 | `agent`, `openAi`, `agentTool` |
| `vectorStoreQdrant` | 139 | 72 | `agent`, `toolVectorStore`, `retrieverVectorStore` |
| `outputParserAutofixing` | 124 | 104 | `agent`, `chainLlm` |
| `textClassifier` | 119 | 111 | `gmail`, `agent`, `set` |
| `memoryPostgresChat` | 103 | 85 | `agent`, `agentTool`, `openAi` |

---

## Most Common Connection Patterns

### Edge Frequency (top 50)

| Source -> Target | Count |
|-----------------|-------|
| `lmChatOpenAi` -> `agent` | 2,454 |
| `httpRequest` -> `code` | 1,695 |
| `httpRequest` -> `httpRequest` | 1,675 |
| `set` -> `httpRequest` | 1,561 |
| `outputParserStructured` -> `agent` | 1,373 |
| `code` -> `httpRequest` | 1,253 |
| `if` -> `httpRequest` | 1,234 |
| `if` -> `set` | 1,185 |
| `code` -> `if` | 1,120 |
| `code` -> `code` | 1,118 |
| `memoryBufferWindow` -> `agent` | 1,010 |
| `if` -> `code` | 974 |
| `wait` -> `httpRequest` | 971 |
| `set` -> `merge` | 946 |
| `httpRequest` -> `if` | 920 |
| `httpRequest` -> `set` | 874 |
| `code` -> `merge` | 859 |
| `code` -> `googleSheets` | 837 |
| `lmChatGoogleGemini` -> `agent` | 835 |
| `set` -> `agent` | 789 |
| `agent` -> `code` | 744 |
| `switch` -> `set` | 720 |
| `httpRequest` -> `wait` | 718 |
| `set` -> `set` | 693 |
| `httpRequest` -> `merge` | 685 |
| `set` -> `code` | 681 |
| `merge` -> `code` | 660 |
| `manualTrigger` -> `set` | 657 |
| `googleSheets` -> `splitInBatches` | 587 |
| `if` -> `wait` | 584 |
| `httpRequestTool` -> `mcpTrigger` | 582 |
| `scheduleTrigger` -> `set` | 575 |
| `if` -> `googleSheets` | 575 |
| `set` -> `googleSheets` | 571 |
| `code` -> `agent` | 565 |
| `if` -> `telegram` | 559 |
| `if` -> `if` | 545 |
| `switch` -> `httpRequest` | 528 |
| `set` -> `if` | 525 |
| `if` -> `noOp` | 513 |
| `webhook` -> `set` | 492 |
| `scheduleTrigger` -> `httpRequest` | 490 |
| `code` -> `splitInBatches` | 488 |
| `code` -> `set` | 487 |
| `splitInBatches` -> `httpRequest` | 466 |
| `scheduleTrigger` -> `googleSheets` | 464 |
| `googleSheets` -> `code` | 455 |
| `toolWorkflow` -> `agent` | 449 |
| `lmChatOpenAi` -> `chainLlm` | 446 |
| `lmChatOpenRouter` -> `agent` | 446 |

### Common Workflow Chains (top 30)

| Chain Pattern | Count |
|---------------|-------|
| `httpRequestTool` -> `mcpTrigger` | 582 |
| `lmChatOpenAi` -> `agent` | 388 |
| `memoryBufferWindow` -> `agent` | 318 |
| `chatTrigger` -> `agent` | 263 |
| `toolWorkflow` -> `agent` | 146 |
| `lmChatOpenAi` -> `agentTool` -> `agent` | 110 |
| `lmChatOpenAi` -> `agent` -> `telegram` | 108 |
| `memoryBufferWindow` -> `agent` -> `telegram` | 101 |
| `toolHttpRequest` -> `agent` | 100 |
| `toolWorkflow` -> `mcpTrigger` | 95 |
| `toolWorkflow` -> `agent` -> `set` | 93 |
| `lmChatGoogleGemini` -> `agent` | 86 |
| `gmailTool` -> `mcpTrigger` | 86 |
| `httpRequestTool` -> `agent` | 78 |
| `lmChatGoogleGemini` -> `agent` -> `telegram` | 77 |
| `lmChatOpenAi` -> `agent` -> `gmail` | 76 |
| `googleCalendarTool` -> `mcpTrigger` | 74 |
| `googleSheetsTool` -> `agent` | 74 |
| `httpRequestTool` -> `agent` -> `code` -> `telegram` | 73 |
| `googleSheetsTool` -> `agent` -> `telegram` | 63 |
| `pipedriveTool` -> `mcpTrigger` | 63 |
| `gmailTool` -> `agent` | 54 |
| `googleCalendarTool` -> `agent` -> `telegram` | 52 |
| `monicaCrmTool` -> `mcpTrigger` | 52 |
| `harvestTool` -> `mcpTrigger` | 51 |
| `activeCampaignTool` -> `mcpTrigger` | 48 |
| `textSplitterRecursiveCharacterTextSplitter` -> `documentDefaultDataLoader` -> `vectorStorePinecone` | 47 |
| `httpRequestTool` -> `agentTool` -> `agent` -> `rapiwa` | 45 |
| `trelloTool` -> `mcpTrigger` | 45 |
| `jiraTool` -> `mcpTrigger` | 44 |

---

## Workflow Archetypes

| Archetype | Count |
|-----------|-------|
| AI/LangChain Agent | 4,550 |
| Scheduled/Cron | 1,084 |
| Webhook-Driven | 691 |
| AI/LLM Integration | 82 |

---

## Node Type Reference

### Complete list by category

### Built-In (596 types)

- **`httpRequest`** — 11,155 uses in 4,077 workflows. Credentials: httpHeaderAuth, shopifyAccessTokenApi, eventbriteOAuth2Api, salesforceOAuth2Api, googleAdsOAuth2Api, httpQueryAuth, httpBasicAuth, httpBearerAuth, mistralCloudApi, youTubeOAuth2Api, wooCommerceApi, microsoftOAuth2Api, hubspotAppToken, airtableTokenApi, microsoftOutlookOAuth2Api, jiraSoftwareCloudApi, openAiApi, oAuth2Api, dropboxOAuth2Api, twilioApi, ynabApi, twitterOAuth2Api, facebookGraphApi, googleApi, wordpressApi, httpCustomAuth, twitterOAuth1Api, googleDocsOAuth2Api, n8nApi, groqApi, zohoOAuth2Api, notionApi, nextCloudApi, serpApi, googlePalmApi, googleOAuth2Api, googleCloudNaturalLanguageOAuth2Api, googleCloudStorageOAuth2Api, supabaseApi, whatsAppApi, calendlyOAuth2Api, googleDriveOAuth2Api, googleSheetsOAuth2Api, spotifyOAuth2Api, redditOAuth2Api, aimlApi, openRouterApi, githubOAuth2Api, airtableApi, stripeApi, rdStationMarketingOAuth2Api, todoistApi, nocoDbApiToken, githubApi, zoomOAuth2Api, linkedInOAuth2Api, browserActApi, oAuth1Api, apifyApi, elevenLabsApi, convertApi, virusTotalApi, pipedriveApi, discordBotApi, tallyApi, gmailOAuth2, zendeskApi, lemlistApi, hubspotOAuth2Api, crowdStrikeOAuth2Api, slackApi, slackOAuth2Api, airtableOAuth2Api, mondayComOAuth2Api, linearOAuth2Api, hubspotDeveloperApi, googleSlidesOAuth2Api, dropcontactApi, cloudflareApi, qdrantApi, qualysApi, microsoftGraphSecurityOAuth2Api, erpNextApi, anthropicApi, quickBooksOAuth2Api, huggingFaceApi, clockifyApi, mailerLiteApi, brightdataApi, highLevelOAuth2Api, [, R, E, D, A, C, T, ], trelloApi, aws, alienVaultApi, asanaOAuth2Api, calApi, intercomApi, ghostAdminApi, perplexityApi, featherlessApi, cohereApi, chatwootApi, serviceNowBasicApi, youtubeTranscriptApi, googleBigQueryOAuth2Api, ocrSpaceApi, goHighLevelApi, lateApi, clickUpApi, magento2Api, googleAnalyticsOAuth2, phantombusterApi, postmarkApi, clickUpOAuth2Api, pineconeApi, veoApi, linkedInCommunityManagementOAuth2Api, togglApi, xeroOAuth2Api
- **`code`** — 10,106 uses in 3,920 workflows. Credentials: googleDriveOAuth2Api
- **`set`** — 9,704 uses in 4,197 workflows. Credentials: none
- **`if`** — 6,201 uses in 3,419 workflows. Credentials: none
- **`googleSheets`** — 5,656 uses in 2,490 workflows. Credentials: googleSheetsOAuth2Api, googleApi, googleSheetsApi
- **`telegram`** — 2,602 uses in 1,058 workflows. Credentials: telegramApi, R, E, D, A, C, T
- **`gmail`** — 2,403 uses in 1,495 workflows. Credentials: gmailOAuth2, googleApi, [, R, E, D, A, C, T, ], gmailApi
- **`merge`** — 2,381 uses in 1,605 workflows. Credentials: none
- **`scheduleTrigger`** — 2,360 uses in 2,102 workflows. Credentials: none
- **`wait`** — 2,171 uses in 1,376 workflows. Credentials: none
- **`manualTrigger`** — 2,039 uses in 2,039 workflows. Credentials: none
- **`splitInBatches`** — 1,887 uses in 1,479 workflows. Credentials: none
- **`googleDrive`** — 1,862 uses in 964 workflows. Credentials: googleDriveOAuth2Api, googleApi
- **`webhook`** — 1,615 uses in 1,349 workflows. Credentials: httpHeaderAuth, httpBasicAuth
- **`splitOut`** — 1,614 uses in 1,080 workflows. Credentials: none
- **`slack`** — 1,493 uses in 965 workflows. Credentials: slackApi, slackOAuth2Api
- **`switch`** — 1,490 uses in 1,102 workflows. Credentials: none
- **`noOp`** — 1,175 uses in 738 workflows. Credentials: none
- **`aggregate`** — 1,169 uses in 842 workflows. Credentials: none
- **`respondToWebhook`** — 1,160 uses in 635 workflows. Credentials: none
- **`filter`** — 1,125 uses in 733 workflows. Credentials: none
- **`airtable`** — 1,087 uses in 350 workflows. Credentials: airtableTokenApi, airtableOAuth2Api, airtableApi
- **`httpRequestTool`** — 1,055 uses in 240 workflows. Credentials: httpBearerAuth, httpHeaderAuth, salesforceOAuth2Api, httpQueryAuth, zendeskApi, googleTasksOAuth2Api, httpBasicAuth, githubApi, discordBotApi, anthropicApi, todoistOAuth2Api, microsoftOAuth2Api, microsoftEntraOAuth2Api, shopifyAccessTokenApi, serpApi, googleDriveOAuth2Api, notionApi, oAuth2Api, httpCustomAuth, airtableTokenApi, aws, googleSheetsOAuth2Api, googleOAuth2Api
- **`formTrigger`** — 873 uses in 846 workflows. Credentials: httpBasicAuth
- **`extractFromFile`** — 699 uses in 505 workflows. Credentials: none
- **`postgres`** — 659 uses in 186 workflows. Credentials: postgres
- **`emailSend`** — 633 uses in 447 workflows. Credentials: smtp
- **`notion`** — 608 uses in 257 workflows. Credentials: notionApi
- **`telegramTrigger`** — 595 uses in 589 workflows. Credentials: telegramApi
- **`function`** — 589 uses in 317 workflows. Credentials: none
- **`dataTable`** — 554 uses in 139 workflows. Credentials: dataTableApi
- **`executeWorkflowTrigger`** — 449 uses in 449 workflows. Credentials: none
- **`googleSheetsTool`** — 447 uses in 207 workflows. Credentials: googleSheetsOAuth2Api, R, E, D, A, C, T, googleApi
- **`convertToFile`** — 446 uses in 348 workflows. Credentials: none
- **`limit`** — 380 uses in 293 workflows. Credentials: none
- **`html`** — 377 uses in 266 workflows. Credentials: none
- **`supabase`** — 376 uses in 113 workflows. Credentials: supabaseApi
- **`rssFeedRead`** — 360 uses in 149 workflows. Credentials: none
- **`executeWorkflow`** — 335 uses in 205 workflows. Credentials: none
- **`whatsApp`** — 317 uses in 149 workflows. Credentials: whatsAppApi
- **`googleCalendarTool`** — 314 uses in 108 workflows. Credentials: googleCalendarOAuth2Api
- **`googleDocs`** — 304 uses in 176 workflows. Credentials: googleDocsOAuth2Api, googleApi
- **`gmailTool`** — 295 uses in 125 workflows. Credentials: gmailOAuth2
- **`gmailTrigger`** — 288 uses in 270 workflows. Credentials: gmailOAuth2
- **`form`** — 278 uses in 133 workflows. Credentials: none
- **`googleCalendar`** — 277 uses in 171 workflows. Credentials: googleCalendarOAuth2Api
- **`googleDriveTrigger`** — 255 uses in 217 workflows. Credentials: googleDriveOAuth2Api, googleApi
- **`hubspot`** — 254 uses in 142 workflows. Credentials: hubspotOAuth2Api, hubspotAppToken, hubspotApi
- **`cron`** — 252 uses in 233 workflows. Credentials: none
- **`redis`** — 251 uses in 59 workflows. Credentials: redis
- **`readWriteFile`** — 240 uses in 130 workflows. Credentials: none
- **`n8n`** — 235 uses in 128 workflows. Credentials: n8nApi
- **`facebookGraphApi`** — 229 uses in 98 workflows. Credentials: facebookGraphApi
- **`discord`** — 209 uses in 127 workflows. Credentials: discordBotApi, discordOAuth2Api, discordWebhookApi
- **`markdown`** — 208 uses in 182 workflows. Credentials: none
- **`github`** — 207 uses in 90 workflows. Credentials: githubApi, githubOAuth2Api
- **`googleSheetsTrigger`** — 201 uses in 187 workflows. Credentials: googleSheetsTriggerOAuth2Api
- **`stopAndError`** — 194 uses in 133 workflows. Credentials: none
- **`executeCommand`** — 176 uses in 72 workflows. Credentials: none
- **`summarize`** — 157 uses in 108 workflows. Credentials: none
- **`microsoftOutlook`** — 157 uses in 75 workflows. Credentials: microsoftOutlookOAuth2Api
- **`openAi`** — 152 uses in 85 workflows. Credentials: openAiApi, openAIApi
- **`airtop`** — 151 uses in 44 workflows. Credentials: airtopApi
- **`removeDuplicates`** — 150 uses in 121 workflows. Credentials: none
- **`jira`** — 149 uses in 83 workflows. Credentials: jiraSoftwareCloudApi
- **`youTube`** — 148 uses in 96 workflows. Credentials: youTubeOAuth2Api, googleApi
- **`nocoDb`** — 147 uses in 34 workflows. Credentials: nocoDbApiToken, nocoDb
- **`errorTrigger`** — 139 uses in 139 workflows. Credentials: none
- **`wordpress`** — 134 uses in 108 workflows. Credentials: wordpressApi
- **`linkedIn`** — 133 uses in 112 workflows. Credentials: linkedInOAuth2Api, linkedInCommunityManagementOAuth2Api
- **`mongoDb`** — 130 uses in 22 workflows. Credentials: mongoDb
- **`twitter`** — 129 uses in 110 workflows. Credentials: twitterOAuth1Api, twitterOAuth2Api, twitterApi
- **`reddit`** — 129 uses in 61 workflows. Credentials: redditOAuth2Api
- **`dateTime`** — 124 uses in 81 workflows. Credentials: none
- **`ssh`** — 116 uses in 44 workflows. Credentials: sshPassword, sshPrivateKey
- **`sort`** — 116 uses in 91 workflows. Credentials: none
- **`airtableTool`** — 111 uses in 36 workflows. Credentials: airtableOAuth2Api, airtableTokenApi
- **`editImage`** — 103 uses in 64 workflows. Credentials: none
- **`twilio`** — 102 uses in 72 workflows. Credentials: twilioApi
- **`crypto`** — 98 uses in 60 workflows. Credentials: none
- **`pipedrive`** — 94 uses in 35 workflows. Credentials: pipedriveApi
- **`whatsAppTrigger`** — 92 uses in 92 workflows. Credentials: whatsAppTriggerApi
- **`itemLists`** — 89 uses in 66 workflows. Credentials: none
- **`xml`** — 87 uses in 73 workflows. Credentials: none
- **`quickbooks`** — 87 uses in 32 workflows. Credentials: quickBooksOAuth2Api
- **`rssFeedReadTrigger`** — 80 uses in 51 workflows. Credentials: none
- **`supabaseTool`** — 76 uses in 20 workflows. Credentials: supabaseApi
- **`emailReadImap`** — 73 uses in 69 workflows. Credentials: imap
- **`clickUp`** — 73 uses in 51 workflows. Credentials: clickUpApi, clickUpOAuth2Api
- **`pipedriveTool`** — 70 uses in 6 workflows. Credentials: pipedriveApi, pipedriveOAuth2Api
- **`evaluation`** — 70 uses in 18 workflows. Credentials: googleSheetsOAuth2Api
- **`jotFormTrigger`** — 69 uses in 69 workflows. Credentials: jotFormApi
- **`notionTool`** — 69 uses in 22 workflows. Credentials: notionApi
- **`spotify`** — 69 uses in 20 workflows. Credentials: spotifyOAuth2Api
- **`zendesk`** — 66 uses in 37 workflows. Credentials: zendeskApi, zendeskOAuth2Api
- **`googleDocsTool`** — 63 uses in 38 workflows. Credentials: googleDocsOAuth2Api, googleApi
- **`baserow`** — 63 uses in 27 workflows. Credentials: baserowApi
- **`phantombuster`** — 63 uses in 12 workflows. Credentials: phantombusterApi
- **`spreadsheetFile`** — 61 uses in 53 workflows. Credentials: none
- **`highLevelTool`** — 61 uses in 5 workflows. Credentials: highLevelOAuth2Api

### Ai (83 types)

- **`agent`** — 4,329 uses in 2,809 workflows. Credentials: postgres
- **`lmChatOpenAi`** — 3,339 uses in 2,040 workflows. Credentials: openAiApi
- **`outputParserStructured`** — 1,963 uses in 1,362 workflows. Credentials: none
- **`openAi`** — 1,714 uses in 1,060 workflows. Credentials: openAiApi, [, R, E, D, A, C, T, ]
- **`lmChatGoogleGemini`** — 1,352 uses in 821 workflows. Credentials: googlePalmApi
- **`chainLlm`** — 1,149 uses in 737 workflows. Credentials: none
- **`memoryBufferWindow`** — 1,067 uses in 858 workflows. Credentials: none
- **`lmChatOpenRouter`** — 686 uses in 387 workflows. Credentials: openRouterApi
- **`chatTrigger`** — 636 uses in 636 workflows. Credentials: httpBasicAuth
- **`toolWorkflow`** — 569 uses in 223 workflows. Credentials: sshPassword
- **`embeddingsOpenAi`** — 441 uses in 263 workflows. Credentials: openAiApi
- **`mcpTrigger`** — 318 uses in 289 workflows. Credentials: httpHeaderAuth
- **`documentDefaultDataLoader`** — 304 uses in 285 workflows. Credentials: none
- **`lmChatAnthropic`** — 282 uses in 186 workflows. Credentials: anthropicApi
- **`googleGemini`** — 269 uses in 186 workflows. Credentials: googlePalmApi
- **`agentTool`** — 254 uses in 69 workflows. Credentials: none
- **`toolHttpRequest`** — 237 uses in 78 workflows. Credentials: httpHeaderAuth, httpQueryAuth, calApi, serpApi, notionApi, openAiApi, clockifyApi, microsoftOutlookOAuth2Api, microsoftAzureMonitorOAuth2Api, httpCustomAuth, httpBearerAuth, httpBasicAuth
- **`toolThink`** — 233 uses in 174 workflows. Credentials: none
- **`informationExtractor`** — 231 uses in 187 workflows. Credentials: none
- **`vectorStorePinecone`** — 217 uses in 116 workflows. Credentials: pineconeApi
- **`textSplitterRecursiveCharacterTextSplitter`** — 197 uses in 185 workflows. Credentials: none
- **`lmChatAzureOpenAi`** — 172 uses in 124 workflows. Credentials: azureOpenAiApi
- **`vectorStoreSupabase`** — 165 uses in 88 workflows. Credentials: supabaseApi
- **`mcpClientTool`** — 156 uses in 114 workflows. Credentials: httpHeaderAuth, httpBearerAuth, httpMultipleHeadersAuth
- **`toolCalculator`** — 150 uses in 116 workflows. Credentials: none
- **`vectorStoreQdrant`** — 139 uses in 72 workflows. Credentials: qdrantApi
- **`outputParserAutofixing`** — 124 uses in 104 workflows. Credentials: none
- **`textClassifier`** — 119 uses in 111 workflows. Credentials: none
- **`memoryPostgresChat`** — 103 uses in 85 workflows. Credentials: postgres
- **`toolSerpApi`** — 85 uses in 70 workflows. Credentials: serpApi
- **`toolCode`** — 84 uses in 50 workflows. Credentials: none
- **`lmChatGroq`** — 83 uses in 63 workflows. Credentials: groqApi
- **`lmChatMistralCloud`** — 80 uses in 44 workflows. Credentials: mistralCloudApi
- **`chainSummarization`** — 79 uses in 74 workflows. Credentials: none
- **`lmChatOllama`** — 79 uses in 55 workflows. Credentials: ollamaApi
- **`embeddingsGoogleGemini`** — 75 uses in 44 workflows. Credentials: googlePalmApi
- **`toolVectorStore`** — 74 uses in 69 workflows. Credentials: none
- **`vectorStoreInMemory`** — 73 uses in 38 workflows. Credentials: none
- **`chat`** — 51 uses in 31 workflows. Credentials: none
- **`lmChatDeepSeek`** — 44 uses in 38 workflows. Credentials: deepSeekApi
- **`toolWikipedia`** — 42 uses in 37 workflows. Credentials: none
- **`rerankerCohere`** — 34 uses in 27 workflows. Credentials: cohereApi
- **`sentimentAnalysis`** — 33 uses in 31 workflows. Credentials: none
- **`textSplitterCharacterTextSplitter`** — 30 uses in 26 workflows. Credentials: none
- **`guardrails`** — 30 uses in 12 workflows. Credentials: none
- **`embeddingsCohere`** — 29 uses in 12 workflows. Credentials: cohereApi
- **`textSplitterTokenSplitter`** — 29 uses in 28 workflows. Credentials: none
- **`chainRetrievalQa`** — 27 uses in 27 workflows. Credentials: none
- **`memoryManager`** — 27 uses in 19 workflows. Credentials: none
- **`lmOllama`** — 26 uses in 23 workflows. Credentials: ollamaApi
- **`vectorStorePGVector`** — 26 uses in 17 workflows. Credentials: postgres
- **`embeddingsOllama`** — 26 uses in 15 workflows. Credentials: ollamaApi
- **`retrieverVectorStore`** — 24 uses in 24 workflows. Credentials: none
- **`vectorStoreMongoDBAtlas`** — 22 uses in 9 workflows. Credentials: mongoDb
- **`embeddingsMistralCloud`** — 21 uses in 10 workflows. Credentials: mistralCloudApi
- **`lmChatXAiGrok`** — 20 uses in 19 workflows. Credentials: xAiApi
- **`code`** — 19 uses in 15 workflows. Credentials: none
- **`memoryRedisChat`** — 18 uses in 14 workflows. Credentials: redis
- **`memoryMongoDbChat`** — 14 uses in 11 workflows. Credentials: mongoDb
- **`anthropic`** — 13 uses in 11 workflows. Credentials: anthropicApi
- **`embeddingsAzureOpenAi`** — 12 uses in 4 workflows. Credentials: azureOpenAiApi
- **`outputParserItemList`** — 9 uses in 8 workflows. Credentials: none
- **`vectorStoreMilvus`** — 9 uses in 5 workflows. Credentials: milvusApi
- **`vectorStoreWeaviate`** — 8 uses in 5 workflows. Credentials: weaviateApi
- **`googleGeminiTool`** — 7 uses in 4 workflows. Credentials: googlePalmApi
- **`vectorStoreRedis`** — 7 uses in 3 workflows. Credentials: redis
- **`lmChatGoogleVertex`** — 6 uses in 6 workflows. Credentials: googleApi
- **`modelSelector`** — 5 uses in 5 workflows. Credentials: none
- **`embeddingsHuggingFaceInference`** — 5 uses in 2 workflows. Credentials: huggingFaceApi
- **`lmChatAwsBedrock`** — 5 uses in 4 workflows. Credentials: aws
- **`lmOpenAi`** — 5 uses in 5 workflows. Credentials: openAiApi
- **`lmChatVercelAiGateway`** — 5 uses in 1 workflows. Credentials: vercelAiGatewayApi
- **`lmOpenHuggingFaceInference`** — 4 uses in 4 workflows. Credentials: huggingFaceApi
- **`manualChatTrigger`** — 4 uses in 4 workflows. Credentials: none
- **`ollama`** — 2 uses in 2 workflows. Credentials: none
- **`retrieverWorkflow`** — 2 uses in 2 workflows. Credentials: none
- **`toolWolframAlpha`** — 2 uses in 2 workflows. Credentials: none
- **`ollamaTool`** — 1 uses in 1 workflows. Credentials: none
- **`mcpClient`** — 1 uses in 1 workflows. Credentials: none
- **`toolSearXng`** — 1 uses in 1 workflows. Credentials: searXngApi
- **`embeddingsAwsBedrock`** — 1 uses in 1 workflows. Credentials: aws
- **`lmChatCohere`** — 1 uses in 1 workflows. Credentials: cohereApi
- **`memoryZep`** — 1 uses in 1 workflows. Credentials: zepApi

### Community (220 types)

- **`blotato`** — 298 uses in 59 workflows. Credentials: blotatoApi
- **`mcpClientTool`** — 118 uses in 59 workflows. Credentials: mcpClientApi, mcpClientSseApi, mcpClientHttpApi
- **`apify`** — 114 uses in 68 workflows. Credentials: apifyApi, apifyOAuth2Api
- **`klicktipp`** — 85 uses in 18 workflows. Credentials: klickTippApi
- **`scrapegraphAi`** — 80 uses in 52 workflows. Credentials: scrapegraphAIApi
- **`decodo`** — 56 uses in 39 workflows. Credentials: decodoApi
- **`mcpClient`** — 47 uses in 20 workflows. Credentials: mcpClientApi, mcpClientHttpApi
- **`htmlcsstopdf`** — 45 uses in 41 workflows. Credentials: htmlcsstopdfApi
- **`evolutionApi`** — 45 uses in 17 workflows. Credentials: evolutionApi
- **`serpApiTool`** — 45 uses in 4 workflows. Credentials: serpApi
- **`firecrawl`** — 44 uses in 22 workflows. Credentials: firecrawlApi
- **`klicktippTool`** — 40 uses in 2 workflows. Credentials: klickTippApi
- **`rapiwa`** — 37 uses in 23 workflows. Credentials: rapiwaApi
- **`oneShot`** — 35 uses in 9 workflows. Credentials: oneShotOAuth2Api
- **`seRanking`** — 34 uses in 5 workflows. Credentials: seRankingApi
- **`serpApi`** — 32 uses in 26 workflows. Credentials: serpApi
- **`browserAct`** — 30 uses in 28 workflows. Credentials: browserActApi
- **`tavilyTool`** — 29 uses in 24 workflows. Credentials: tavilyApi
- **`verifiEmail`** — 29 uses in 29 workflows. Credentials: verifiEmailApi
- **`zeroBounce`** — 28 uses in 7 workflows. Credentials: zeroBounceApi
- **`vlmRun`** — 27 uses in 20 workflows. Credentials: vlmRunApi
- **`brightData`** — 27 uses in 16 workflows. Credentials: brightdataApi
- **`uploadPost`** — 26 uses in 17 workflows. Credentials: uploadPostApi
- **`browserAct`** — 25 uses in 12 workflows. Credentials: browserActApi
- **`exploriumApiNode`** — 23 uses in 9 workflows. Credentials: exploriumApi
- **`elevenLabs`** — 23 uses in 19 workflows. Credentials: elevenLabsApi
- **`postiz`** — 21 uses in 12 workflows. Credentials: postizApi
- **`scrapeless`** — 17 uses in 7 workflows. Credentials: scrapelessApi
- **`gotoHuman`** — 16 uses in 12 workflows. Credentials: gotoHumanApi
- **`browserflow`** — 16 uses in 6 workflows. Credentials: browserflowApi
- **`PDFco Api`** — 16 uses in 12 workflows. Credentials: pdfcoApi
- **`brightData`** — 16 uses in 8 workflows. Credentials: brightdataApi
- **`sinergiaCrm`** — 16 uses in 3 workflows. Credentials: SinergiaCRMCredentials
- **`htmlCssToImage`** — 15 uses in 15 workflows. Credentials: htmlcsstoimgApi
- **`oneShotSynch`** — 15 uses in 8 workflows. Credentials: oneShotOAuth2Api
- **`dart`** — 14 uses in 4 workflows. Credentials: dartApi
- **`gowa`** — 14 uses in 3 workflows. Credentials: goWhatsappApi
- **`tavily`** — 13 uses in 12 workflows. Credentials: tavilyApi
- **`aimlApi`** — 13 uses in 11 workflows. Credentials: aimlApi
- **`qdrant`** — 13 uses in 4 workflows. Credentials: qdrantRestApi, qdrantApi
- **`hdwLinkedinTool`** — 12 uses in 1 workflows. Credentials: hdwLinkedinApi
- **`decodoTool`** — 11 uses in 11 workflows. Credentials: decodoApi
- **`fireflies`** — 11 uses in 7 workflows. Credentials: firefliesApi
- **`connectSafelyLinkedIn`** — 11 uses in 7 workflows. Credentials: connectSafelyApi
- **`klicktipp`** — 11 uses in 6 workflows. Credentials: klickTippApi
- **`vtigerNode`** — 10 uses in 4 workflows. Credentials: vtigerApi
- **`postPulse`** — 10 uses in 3 workflows. Credentials: postPulseOAuth2Api
- **`streakTool`** — 9 uses in 1 workflows. Credentials: streakApi
- **`telePilot`** — 9 uses in 2 workflows. Credentials: telePilotApi
- **`braveSearchTool`** — 9 uses in 3 workflows. Credentials: braveSearchApi
- **`ScrapeOps`** — 8 uses in 5 workflows. Credentials: scrapeOpsApi
- **`prospectpro`** — 8 uses in 4 workflows. Credentials: prospectproApi
- **`klicktippTrigger`** — 7 uses in 7 workflows. Credentials: klickTippApi
- **`portIo`** — 7 uses in 1 workflows. Credentials: portIoApi
- **`runNodeWithCredentialsX`** — 7 uses in 2 workflows. Credentials: none
- **`octave`** — 7 uses in 4 workflows. Credentials: octaveApi
- **`pdfGeneratorApi`** — 6 uses in 5 workflows. Credentials: pdfGeneratorApi
- **`linkedApi`** — 6 uses in 1 workflows. Credentials: linkedApi
- **`netSuiteRest`** — 6 uses in 2 workflows. Credentials: netSuiteRestOAuth2Api
- **`html2Pdf`** — 6 uses in 6 workflows. Credentials: customJsApi
- **`tesseractNode`** — 6 uses in 6 workflows. Credentials: none
- **`bedrijfsdata`** — 6 uses in 3 workflows. Credentials: bedrijfsdataApi
- **`chatWoot`** — 6 uses in 1 workflows. Credentials: chatwootApi
- **`dataForSeo`** — 5 uses in 3 workflows. Credentials: dataForSeoApi
- **`evolutionApi`** — 5 uses in 2 workflows. Credentials: evolutionApi
- **`easyRedmine`** — 5 uses in 5 workflows. Credentials: easyRedmineApi
- **`braveSearch`** — 5 uses in 5 workflows. Credentials: braveSearchApi
- **`hdwLinkedin`** — 5 uses in 1 workflows. Credentials: hdwLinkedinApi
- **`blotatoTool`** — 5 uses in 2 workflows. Credentials: blotatoApi
- **`templated`** — 4 uses in 3 workflows. Credentials: templatedApi
- **`puppeteer`** — 4 uses in 4 workflows. Credentials: none
- **`signal`** — 4 uses in 1 workflows. Credentials: signalApi
- **`cloudinary`** — 4 uses in 3 workflows. Credentials: cloudinaryApi
- **`jsonCut`** — 4 uses in 1 workflows. Credentials: jsonCutApi
- **`googleSearchConsole`** — 4 uses in 3 workflows. Credentials: googleSearchConsoleOAuth2Api
- **`xano`** — 4 uses in 1 workflows. Credentials: none
- **`contextualAi`** — 4 uses in 3 workflows. Credentials: contextualAiApi
- **`wiza`** — 4 uses in 2 workflows. Credentials: wizaApi
- **`pineconeAssistantTool`** — 4 uses in 4 workflows. Credentials: pineconeAssistantApi
- **`keyValueStorage`** — 4 uses in 1 workflows. Credentials: none
- **`globalConstants`** — 4 uses in 3 workflows. Credentials: globalConstantsApi
- **`craftMyPdf`** — 4 uses in 4 workflows. Credentials: craftMyPdfApi
- **`googlePageSpeed`** — 4 uses in 1 workflows. Credentials: googlePageSpeedApi
- **`datastore`** — 4 uses in 1 workflows. Credentials: none
- **`late`** — 3 uses in 1 workflows. Credentials: lateApi
- **`crawleeNode`** — 3 uses in 2 workflows. Credentials: none
- **`razorpay`** — 3 uses in 1 workflows. Credentials: none
- **`apify`** — 3 uses in 1 workflows. Credentials: none
- **`infranodusTool`** — 3 uses in 2 workflows. Credentials: infranodusApi
- **`beex`** — 3 uses in 3 workflows. Credentials: beexApi
- **`inboxPlus`** — 3 uses in 2 workflows. Credentials: inboxPlusApi
- **`instagram`** — 3 uses in 3 workflows. Credentials: none
- **`powerBi`** — 3 uses in 2 workflows. Credentials: powerBiApiOAuth2Api
- **`scrapeCreators`** — 3 uses in 2 workflows. Credentials: scrapeCreatorsApi
- **`attio`** — 3 uses in 1 workflows. Credentials: attioApi
- **`veed`** — 3 uses in 3 workflows. Credentials: none
- **`pineconeAssistant`** — 3 uses in 2 workflows. Credentials: pineconeAssistantApi
- **`pdforge`** — 3 uses in 3 workflows. Credentials: pdforgeApi
- **`scrapeNinja`** — 3 uses in 1 workflows. Credentials: scrapeNinjaApi
- **`hdwLinkedinManagement`** — 3 uses in 1 workflows. Credentials: hdwLinkedinApi


---

## Parameter Reference (Top 30 Nodes)

### `httpRequest` (11,155 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 9,025 | dict |  |
| `url` | 9,001 | str | ={{ 'https://api.elevenlabs.io/v1/text-to-speech/' + $('Workflow Configuration')... |
| `method` | 4,509 | str | POST; =GET; PUT |
| `sendBody` | 4,470 | bool | True; False |
| `authentication` | 4,366 | str | genericCredentialType; predefinedCredentialType; headerAuth |
| `headerParameters.parameters[].name` | 4,053 | str | xi-api-key; Content-Type; Accept |
| `headerParameters.parameters[].value` | 3,946 | str | ={{ $('Workflow Configuration').first().json.elevenLabsApiKey }}; application/js... |
| `bodyParameters.parameters[].name` | 3,259 | str | file; prompt; lyrics_prompt |
| `sendHeaders` | 3,185 | bool | True; False |
| `headerParameters` | 3,097 | dict |  |
| `headerParameters.parameters` | 3,096 | list |  |
| `bodyParameters.parameters[].value` | 2,957 | str, int, float, bool | ={{ $json.Lyrics }}; ={{ $json.Lyrical_style }}; ={{ $('Create a Report').item.j... |
| `genericAuthType` | 2,732 | str | httpHeaderAuth; httpBasicAuth; httpBearerAuth |
| `specifyBody` | 2,596 | str | json; =json; string |
| `jsonBody` | 2,589 | str | ={{ 
  {
    "text": $json.message.content,
    "model_id": "eleven_multilingual... |

### `code` (10,106 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `jsCode` | 8,194 | str | return items.map(item => {
  const b = item.binary?.audio;            // <-- ta ... |
| `mode` | 608 | str | runOnceForEachItem; raw; runOnceForAllItems |
| `language` | 95 | str | python; pythonNative; javascript |
| `pythonCode` | 89 | str | input_data = items[0]['json']

# Extract the influencers string from the "Add li... |
| `notice` | 2 | str | Splits the recommendations array into individual items - first item for email re... |

### `set` (9,704 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `assignments.assignments[].value` | 13,078 | str, int, bool, dict, float, list, NoneType | YOUR_ELEVENLABS_API_KEY; YOUR_VOICE_ID; YOUR_FAL_API_KEY |
| `assignments.assignments[].name` | 13,065 | str | elevenLabsApiKey; elevenLabsVoiceId; falApiKey |
| `assignments.assignments[].type` | 13,065 | str | string; number; object |
| `assignments.assignments[].id` | 12,970 | str | id-1; id-2; id-3 |
| `options` | 7,959 | dict |  |
| `assignments` | 6,738 | dict |  |
| `assignments.assignments` | 6,738 | list |  |
| `values.string[].name` | 1,011 | str | url; geo; html_content |
| `values.string[].value` | 996 | str | https://dev.to; france; =<html>
   <head>
     <style>
       body { font-family... |
| `includeOtherFields` | 958 | bool, str | True; ={{ true }};  |
| `values` | 537 | dict, list |  |
| `values.string` | 505 | list |  |
| `mode` | 383 | str | raw; jsonData; manual |
| `jsonOutput` | 371 | str | ={{ $json.output }}; {
  "startUrl": "https://quotes.toscrape.com/tag/humor/",
 ... |
| `fields.values[].name` | 365 | str | name; email; role |

### `if` (6,201 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `conditions.conditions[].operator` | 5,455 | dict |  |
| `conditions.conditions[].operator.type` | 5,455 | str | string; number; boolean |
| `conditions.conditions[].leftValue` | 5,455 | str, bool, int | ={{ $json.message.text }}; ={{ $json.repairPhotos }}; ={{ $json.drive_file_id }} |
| `conditions.conditions[].operator.operation` | 5,454 | str | contains; exists; equals |
| `conditions.conditions[].id` | 5,375 | str | url-check-1; 2b7e9e14-1e29-44c5-a2b0-00918dcd0100; 8b3e6db0-8236-4eec-926e-68df6... |
| `conditions.conditions[].rightValue` | 5,342 | str, int, bool, dict, float, NoneType | tiktok.com; ; 0 |
| `conditions` | 5,205 | dict, list |  |
| `options` | 4,562 | dict |  |
| `conditions.conditions` | 4,492 | list |  |
| `conditions.options` | 4,476 | dict |  |
| `conditions.options.caseSensitive` | 4,456 | bool | True; False |
| `conditions.combinator` | 4,438 | str | and; or |
| `conditions.options.typeValidation` | 4,434 | str | loose; strict |
| `conditions.options.leftValue` | 4,420 | str | ; ={{ $json.SpeechResult }}; ={{ $json.choices[0].message.content.toLowerCase() ... |
| `conditions.options.version` | 3,885 | int | 2; 1; 3 |

### `googleSheets` (5,656 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `columns.schema[].id` | 7,481 | str | IDEA; URL IMAGE; URL AUDIO |
| `columns.schema[].displayName` | 7,475 | str | IDEA; URL IMAGE; URL AUDIO |
| `columns.schema[].canBeUsedToMatch` | 7,445 | bool | True; False |
| `columns.schema[].required` | 7,439 | bool | False; True |
| `columns.schema[].defaultMatch` | 7,427 | bool | False; True |
| `columns.schema[].type` | 7,358 | str | string; number |
| `columns.schema[].display` | 7,304 | bool | True |
| `documentId` | 4,388 | dict, str | 9x8w7v6u5t4s3r2q; 5x4w3v2u1t0s9r8q; ={{ $('Config1').item.json.SPREADSHEET_ID }} |
| `sheetName` | 4,353 | dict, str | Applications; Daily_Cash_Flow; Marketing_Campaigns |
| `documentId.mode` | 4,300 | str | id; list; url |
| `documentId.value` | 4,300 | str | =; 1v4vjL5K1tMDUyswcFaLPA1vraViwnPSbqxkVeld9Dk0; 1ubRqvf5deapQMzSbh271fJkwBiMk1i... |
| `documentId.__rl` | 4,298 | bool | True; False |
| `sheetName.value` | 4,261 | str, int | =; gid=0; 1646368885 |
| `sheetName.mode` | 4,257 | str | id; list; name |
| `sheetName.__rl` | 4,247 | bool | True; False |

### `agent` (4,329 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 3,497 | dict |  |
| `text` | 3,138 | str | =You are a content curator for personalized learning. Your task is to analyze ar... |
| `promptType` | 3,119 | str | define; guardrails; =define |
| `options.systemMessage` | 2,568 | str | =You are an AI songwriting agent that generates original song lyrics instantly f... |
| `hasOutputParser` | 1,338 | bool | True |
| `options.maxIterations` | 99 | int, str | 30; 3; 2 |
| `options.returnIntermediateSteps` | 87 | bool, str | False; True; ={{ $('Telegram Trigger').item.json.message.chat.id }} |
| `needsFallback` | 82 | bool | True |
| `agent` | 73 | str | conversationalAgent; sqlAgent; openAiFunctionsAgent |
| `options.passthroughBinaryImages` | 43 | bool | False; True |
| `options.enableStreaming` | 19 | bool | True; False |
| `options.batching` | 6 | dict |  |
| `options.batching.delayBetweenBatches` | 5 | int | 10; 1; 0 |
| `options.humanMessage` | 5 | str | TOOLS
------
Assistant can ask the user to use tools to look up information that... |
| `options.batching.batchSize` | 4 | int | 3; 1 |

### `lmChatOpenAi` (3,339 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 2,715 | dict |  |
| `model` | 2,548 | dict, str | gpt-4o; =gpt-4o-mini; gpt-4.1-mini |
| `model.value` | 2,372 | str | gpt-4o-mini; gpt-5-chat-latest; gpt-4.1-mini |
| `model.mode` | 2,368 | str | list; id |
| `model.__rl` | 2,366 | bool | True |
| `model.cachedResultName` | 951 | str | gpt-4o-mini; gpt-5-chat-latest; gpt-5-nano |
| `builtInTools` | 347 | dict |  |
| `options.temperature` | 242 | float, int | 0.2; 0.3; 0.7 |
| `options.responseFormat` | 79 | str | json_object; text |
| `options.maxTokens` | 63 | int | 2000; 3000; 500 |
| `responsesApiEnabled` | 29 | bool | False |
| `options.timeout` | 22 | int | 600000; 6000000; 90000 |
| `options.frequencyPenalty` | 19 | float, int | 0.5; 1; 0.2 |
| `options.topP` | 18 | float, int | 0.9; 1; 0.7 |
| `options.maxRetries` | 15 | int | 1; 3; 2 |

### `telegram` (2,602 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `additionalFields` | 1,898 | dict |  |
| `chatId` | 1,798 | str, dict | ={{ $('Telegram Trigger').first().json.message.chat.id }}; ={{ $('Telegram Trigg... |
| `text` | 1,541 | str | ❌ Please send a valid TikTok link!

Examples:
• https://www.tiktok.com/@user/vid... |
| `additionalFields.appendAttribution` | 908 | bool | False; True |
| `additionalFields.parse_mode` | 413 | str | HTML; MarkdownV2; Markdown |
| `operation` | 350 | str | sendVideo; sendChatAction; deleteMessage |
| `resource` | 226 | str | file; chat; callback |
| `fileId` | 210 | str | ={{ $json.photoUrl }}; ={{ $json.fileid }}; ={{ $json.message.document.file_id }... |
| `binaryData` | 138 | bool | True |
| `replyMarkup` | 113 | str, dict | =none; replyKeyboard; inlineKeyboard |
| `inlineKeyboard.rows[].row.buttons[].text` | 109 | str | 🔁 Спробувати ще раз; 🔓 Отримати доступ; HTML |
| `inlineKeyboard.rows[].row.buttons[].additionalFields` | 109 | dict |  |
| `inlineKeyboard.rows[].row.buttons[].additionalFields.callback_data` | 97 | str | check_subscription; feedback_yes; feedback_no |
| `additionalFields.caption` | 84 | str | =✅ Video downloaded successfully!

👤 Author: @{{ $('Extract Video URL').item.jso... |
| `inlineKeyboard.rows[].row` | 70 | dict |  |

### `gmail` (2,403 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 1,668 | dict |  |
| `message` | 1,533 | str | =<a href=[ADD LINK TO SPREADSHEET]><h3>Vew Repair Log</h3></a>

<strong>UUID:</s... |
| `subject` | 1,497 | str | =Repair update submitted
; =n8nTESt - Urgency: {{ $json.urgency }}. Service Requ... |
| `sendTo` | 1,335 | str | ={{ $('Form Trigger').item.json['Email Address'] }}; ={{ $('On form submission')... |
| `operation` | 560 | str | getAll; sendAndWait; reply |
| `emailType` | 408 | str | text; html; inbox |
| `options.appendAttribution` | 395 | bool | False; True |
| `messageId` | 324 | str | ={{ $('New Email').item.json.id }}; ={{ $json.id }}; ={{ $('Save Inquiry Mail').... |
| `resource` | 166 | str | message; draft; thread |
| `labelIds` | 157 | list, str | ={{ $json.output.labelID }}; ={{ $('Gmail Trigger').item.json.labelIds[0] }}; ={... |
| `filters` | 113 | dict |  |
| `simple` | 105 | bool | False |
| `options.attachmentsUi` | 103 | dict |  |
| `options.attachmentsUi.attachmentsBinary` | 102 | list |  |
| `returnAll` | 68 | bool | True |

### `merge` (2,381 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `mode` | 1,215 | str | chooseBranch; combine; mergeByKey |
| `options` | 1,005 | dict |  |
| `combineBy` | 675 | str | combineAll; combineByPosition |
| `numberInputs` | 358 | int | 9; 3; 6 |
| `joinMode` | 97 | str | keepEverything; enrichInput2; keepNonMatches |
| `combinationMode` | 96 | str | mergeByPosition; multiplex |
| `mergeByFields` | 91 | dict |  |
| `mergeByFields.values` | 91 | list |  |
| `fieldsToMatchString` | 85 | str | UUID; rawResponse.message.content; category_id |
| `mergeByFields.values[].field1` | 79 | str | workflowId; sceneNumber; domain |
| `mergeByFields.values[].field2` | 79 | str | workflowId; sceneNumber; domain |
| `advanced` | 60 | bool | True |
| `options.includeUnpaired` | 59 | bool | True; False |
| `propertyName1` | 37 | str | interviewers[0].id; data.name; data.updatedAt |
| `propertyName2` | 37 | str | fields.eid; data.name; data.updatedAt |

### `scheduleTrigger` (2,360 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `rule` | 1,978 | dict |  |
| `rule.interval` | 1,978 | list |  |
| `rule.interval[].field` | 1,003 | str | minutes; months; weeks |
| `rule.interval[].triggerAtHour` | 803 | int, str | 8; 18; 21 |
| `rule.interval[].expression` | 173 | str | 0 0 * * *; 0 0 1 * *; 0 6 * * * |
| `rule.interval[].hoursInterval` | 169 | int | 2; 24; 12 |
| `rule.interval[].triggerAtDay` | 140 | list |  |
| `rule.interval[].minutesInterval` | 133 | int | 15; 30; 10 |
| `rule.interval[].triggerAtMinute` | 121 | int, dict, str, NoneType | 30; 1; 10 |
| `rule.interval[].daysInterval` | 55 | int, str | 7; 3; 5 |
| `rule.interval[].secondsInterval` | 8 | int | 20; 5; 10 |
| `rule.interval[].weeksInterval` | 7 | int | 2; 4 |
| `rule.interval[].triggerAtDayOfMonth` | 6 | int | 28; 5; 10 |
| `rule.interval[].monthsInterval` | 3 | int | 2; 12 |
| `rule.interval[].value` | 3 | str | 0 6 * * *; 0 8 * * 1-5 |

### `wait` (2,171 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `amount` | 1,114 | int, str, float | 10; 30; 15 |
| `unit` | 404 | str | minutes; days; hours |
| `resume` | 63 | str, bool | webhook; specificTime; form |
| `options` | 46 | dict |  |
| `limitWaitTime` | 19 | bool | True |
| `resumeAmount` | 17 | int | 30; 24; 5 |
| `dateTime` | 13 | str | ={{ new Date(new Date($('Extract locations').item.json.startDate).getTime() - 24... |
| `httpMethod` | 12 | str | POST |
| `resumeUnit` | 12 | str | minutes; days; seconds |
| `formFields.values[].fieldOptions.values[].option` | 10 | str | approve; reject; 0 |
| `responseMode` | 5 | str | lastNode; responseNode |
| `formTitle` | 4 | str | Review the posts  |
| `formFields` | 4 | dict |  |
| `formFields.values` | 4 | list |  |
| `formFields.values[].fieldType` | 4 | str | dropdown |

### `manualTrigger` (2,039 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 1 | dict |  |

### `outputParserStructured` (1,963 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `jsonSchemaExample` | 983 | str | {
  "product_title": "Naruto Motivational Anime Poster - Ninja Way",
  "matched_... |
| `schemaType` | 545 | str | manual |
| `inputSchema` | 543 | str | ={
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
 ... |
| `autoFix` | 215 | bool, str | True; =; ={{ false }} |
| `jsonSchema` | 13 | str | {
 "type": "object",
 "properties": {
 "needsReply": {
 "type": "boolean"
 }
 },... |
| `customizeRetryPrompt` | 2 | bool | True |
| `notice` | 1 | str | Ensures AI output is returned in structured JSON format with recommendations arr... |
| `requestOptions` | 1 | dict |  |
| `prompt` | 1 | str | Instructions:
--------------
{instructions}
--------------
Completion:
---------... |

### `splitInBatches` (1,887 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 1,479 | dict |  |
| `batchSize` | 194 | int, str | 50; 5; 4 |
| `options.reset` | 146 | bool, str | False; ={{ $prevNode.name === 'Split Out4' }}; ={{ $('Loop Over Platforms').cont... |

### `googleDrive` (1,862 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 1,483 | dict |  |
| `driveId` | 732 | dict |  |
| `driveId.__rl` | 732 | bool | True |
| `driveId.mode` | 732 | str | list; id; name |
| `driveId.value` | 732 | str | My Drive; YOUR_FOLDER_ID_HERE; 19v0fUzeIKVLBqBfQBJ1yK2FPCEPSA5-h |
| `operation` | 732 | str | download; deleteFile; share |
| `folderId` | 731 | dict, str | ={{ $json.employeeId }}; QUARANTINE_VAULT; ={{ 'AUDIT_VAULT_' + $json.custodyID.... |
| `folderId.__rl` | 723 | bool | True |
| `folderId.mode` | 723 | str | list; url; id |
| `folderId.value` | 722 | str | 1YoLmXkOmch_GRUmFd4UxUKzbYFlXSxC0; root; https://drive.google.com/drive/u/0/fold... |
| `fileId` | 662 | dict, str | ={{ $json.id }}; ={{ $json.body?.fileId || 'YOUR_DEFAULT_ID' }}; PO_FILE_ID |
| `name` | 660 | str | =Repair Photo-{{ $('On form submission').item.json['UUID:'] }}-{{ $('On form sub... |
| `fileId.__rl` | 637 | bool | True |
| `fileId.mode` | 637 | str | id; url; list |
| `fileId.value` | 637 | str | ={{ $json.drive_file_id }}; ={{ $json.id }}; ={{ $json.output.jd_match.jd_file_i... |

### `openAi` (1,714 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `messages.values[].content` | 1,361 | str | =Based on these trends: {{ $json.choices[0].message.content }}

Create a viral 3... |
| `options` | 1,312 | dict |  |
| `modelId` | 1,046 | dict, str | gpt-4.1; gpt-4o-mini; gpt-4o |
| `modelId.mode` | 1,038 | str | id; list |
| `modelId.value` | 1,038 | str | gpt-4o-mini; chatgpt-4o-latest; gpt-4.1 |
| `modelId.__rl` | 1,024 | bool | True |
| `modelId.cachedResultName` | 917 | str | CHATGPT-4O-LATEST; GPT-4.1; GPT-4.1-MINI |
| `messages` | 794 | dict |  |
| `messages.values` | 794 | list |  |
| `messages.values[].role` | 532 | str | system; =user; assistant |
| `resource` | 380 | str | image; audio; chat |
| `jsonOutput` | 345 | bool, str | True; ={{ true }}; ={{ false }} |
| `operation` | 260 | str | analyze; transcribe; message |
| `responses.values[].content` | 209 | str | =You are an expert customer support triage system with deep understanding of mul... |
| `responses` | 143 | dict |  |

### `webhook` (1,615 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `path` | 1,350 | str | amplitude-pql-cohort; auth; create-ugc-video |
| `options` | 1,348 | dict |  |
| `httpMethod` | 1,055 | str, list | POST; PUT; DELETE |
| `responseMode` | 714 | str | responseNode; lastNode; streaming |
| `authentication` | 59 | str | headerAuth; basicAuth; jwtAuth |
| `options.rawBody` | 41 | bool | True; False |
| `multipleMethods` | 35 | bool | True |
| `responseData` | 34 | str | firstEntryBinary; allEntries; noData |
| `options.responseData` | 26 | str, dict | Here_is_yours_code; Process started!; allEntries |
| `options.allowedOrigins` | 22 | str | *; http://localhost:5176,https://seanlon.site, https://dragonjump.github.io/sean... |
| `options.binaryPropertyName` | 16 | str | file; data; UploadCV0 |
| `options.responseHeaders.entries[].name` | 15 | str | Content-Type; Access-Control-Allow-Origin; X-Content-Type-Options |
| `options.responseHeaders.entries[].value` | 15 | str | text/html; application/json; text/html; charset=utf-8 |
| `options.responseHeaders` | 12 | dict |  |
| `options.responseHeaders.entries` | 12 | list |  |

### `splitOut` (1,614 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 1,280 | dict |  |
| `fieldToSplitOut` | 1,274 | str | attendees; body.data; results |
| `include` | 186 | str | allOtherFields; =; selectedOtherFields |
| `fieldsToInclude` | 64 | str | paramsConfig,nickname,carouselFolder,isPremiumUser,bucketName; name; output.Best... |
| `options.destinationFieldName` | 60 | str | ={{ $json.fields.map(item => item.keys()[0]).join() }}; data; prompt |
| `options.includeBinary` | 17 | bool | False; True |
| `options.disableDotNotation` | 1 | bool | False |

### `slack` (1,493 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `otherOptions` | 1,174 | dict |  |
| `text` | 1,131 | str | ={{ $json.content.parts[0].text }}; ={{ `✅ Code Review Completed\n${$json.summar... |
| `select` | 1,029 | str | channel; user |
| `channelId` | 919 | dict, str | ={{ $json.teamChannel }}; YOUR_SLACK_CHANNEL_ID;  |
| `channelId.mode` | 895 | str | id; list; name |
| `channelId.value` | 895 | str | YOUR_SLACK_CHANNEL; <YOUR_SLACK_CHANNEL_ID>;  |
| `channelId.__rl` | 891 | bool | True |
| `authentication` | 465 | str | oAuth2 |
| `channelId.cachedResultName` | 445 | str | code-reviews; new_product_added; SLACK_CHANNEL_NAME |
| `otherOptions.includeLinkToWorkflow` | 211 | bool, str | False; True; ={{ false }} |
| `user` | 157 | dict |  |
| `user.value` | 157 | str | ; U063KFE3KNW; U09HMPVD466 |
| `user.mode` | 156 | str | list; username; id |
| `user.__rl` | 155 | bool | True |
| `operation` | 113 | str | update; sendAndWait; getAll |

### `switch` (1,490 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `rules.values[].conditions.conditions[].operator` | 2,732 | dict |  |
| `rules.values[].conditions.conditions[].operator.type` | 2,732 | str | string; boolean; object |
| `rules.values[].conditions.conditions[].operator.operation` | 2,732 | str | equals; notEquals; true |
| `rules.values[].conditions.conditions[].leftValue` | 2,732 | str, dict, bool | ={{ $json.status }}; ={{ $json.output.lead_classification }}; ={{ $json.checked_... |
| `rules.values[].conditions.conditions[].rightValue` | 2,725 | str, int, bool, float, list, NoneType | COMPLETED; =Unused; =Used |
| `rules.values[].conditions` | 2,680 | dict |  |
| `rules.values[].conditions.conditions` | 2,680 | list |  |
| `rules.values[].conditions.options` | 2,669 | dict |  |
| `rules.values[].conditions.options.caseSensitive` | 2,667 | bool | True; False |
| `rules.values[].conditions.combinator` | 2,667 | str | and; or |
| `rules.values[].conditions.options.leftValue` | 2,658 | str |  |
| `rules.values[].conditions.options.typeValidation` | 2,657 | str | strict; loose |
| `rules.values[].conditions.options.version` | 2,367 | int | 2; 1; 3 |
| `rules.values[].conditions.conditions[].id` | 2,345 | str | d8b8dbdc-1ad9-4ab9-8b2d-e76fd5db0899; 9c10982c-5f8c-4eec-9b8a-f4b42e99ecf9; d40b... |
| `rules.values[].renameOutput` | 2,039 | bool, str | True; =0; = |

### `lmChatGoogleGemini` (1,352 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 1,185 | dict |  |
| `modelName` | 584 | str | models/gemini-2.5-pro; models/gemini-2.0-flash; models/gemini-2.0-flash-lite |
| `options.temperature` | 75 | float, int | 0.2; 0.5; 1 |
| `options.safetySettings.values[].category` | 33 | str | HARM_CATEGORY_HARASSMENT; HARM_CATEGORY_HATE_SPEECH; HARM_CATEGORY_SEXUALLY_EXPL... |
| `options.safetySettings.values[].threshold` | 32 | str | BLOCK_NONE |
| `options.maxOutputTokens` | 26 | int | 1024; 65536; 3000 |
| `options.topP` | 18 | int, float | 1; 0.8; 0.6 |
| `options.safetySettings` | 13 | dict |  |
| `options.safetySettings.values` | 13 | list |  |
| `options.topK` | 9 | int | 40; 1 |

### `noOp` (1,175 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|

### `aggregate` (1,169 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 920 | dict |  |
| `aggregate` | 618 | str | aggregateAllItemData; =aggregateAllItemData; ={{ $json.urlset }} |
| `fieldsToAggregate.fieldToAggregate[].fieldToAggregate` | 362 | str | message.content.abstract; Telegram_id; data.downloadUrl |
| `fieldsToAggregate` | 303 | dict |  |
| `fieldsToAggregate.fieldToAggregate` | 303 | list |  |
| `destinationFieldName` | 214 | str | allData; fields; reference_images |
| `fieldsToAggregate.fieldToAggregate[].renameField` | 81 | bool | True |
| `fieldsToAggregate.fieldToAggregate[].outputFieldName` | 81 | str | messages; guids; titles |
| `include` | 61 | str | specifiedFields; allFieldsExcept |
| `fieldsToInclude` | 54 | str | id,name; enriched, services; url |
| `options.mergeLists` | 23 | bool | True; False |
| `options.includeBinaries` | 19 | bool | True; False |
| `fieldsToExclude` | 5 | str | referral_link, image, image_base64, rank, global_rank, image_alt; referral_link,... |

### `respondToWebhook` (1,160 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 952 | dict |  |
| `respondWith` | 809 | str | text; json; allIncomingItems |
| `responseBody` | 630 | str, dict | =<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; dis... |
| `options.responseCode` | 288 | int, str | 200; 500; 409 |
| `options.responseHeaders.entries[].name` | 142 | str | Access-Control-Allow-Headers; Access-Control-Allow-Methods; Content-Type |
| `options.responseHeaders.entries[].value` | 142 | str | Content-Type; POST, OPTIONS; text/plain; charset=utf-8 |
| `options.responseHeaders` | 120 | dict |  |
| `options.responseHeaders.entries` | 120 | list |  |
| `redirectURL` | 9 | str | https://line.me/R/ti/p/@YOUR_LINE_OFFICIAL_ACCOUNT_ID; =https://www.roblox.com/g... |
| `options.responseKey` | 6 | str | ={   "status": "received",   "type": "{{ $json.triage.type }}",   "severity": "{... |
| `responseDataSource` | 3 | str | set |
| `options.enableStreaming` | 3 | bool | True |
| `responseCode` | 3 | int | 200 |
| `responseBody.message` | 2 | str | {{ $('confirmation-generator').item.json.choices[0].message.content }}; Email pr... |
| `twiml` | 2 | str | <?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>{{ $json.audio_url }}<... |

### `chainLlm` (1,149 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `text` | 867 | str | =You are an SEO analyzer. Analyze the following webpage content and return a con... |
| `promptType` | 865 | str | define; =auto |
| `messages.messageValues[].message` | 587 | str | =You are a Shopify product content generator AI.  
Your task is to take structur... |
| `messages` | 559 | dict |  |
| `messages.messageValues` | 559 | list |  |
| `batching` | 478 | dict |  |
| `hasOutputParser` | 394 | bool | True |
| `messages.messageValues[].type` | 84 | str | HumanMessagePromptTemplate; AIMessagePromptTemplate; =SystemMessagePromptTemplat... |
| `messages.messageValues[].messageType` | 22 | str | imageBinary; imageUrl |
| `needsFallback` | 13 | bool | True |
| `batching.batchSize` | 6 | int | 5; 20; 10 |
| `messages.messageValues[].binaryImageDataKey` | 6 | str | data_1; data_2; Image |
| `prompt` | 5 | str | =Subject: {{ $json.subject }}
Message:
{{ $json.textAsHtml }} ; ={{ $json.text }... |
| `messages.messageValues[].imageUrl` | 1 | str | = |

### `filter` (1,125 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `conditions.conditions[].operator` | 1,166 | dict |  |
| `conditions.conditions[].operator.type` | 1,166 | str | boolean; string; array |
| `conditions.conditions[].operator.operation` | 1,166 | str | true; exists; notContains |
| `conditions.conditions[].leftValue` | 1,166 | str, bool | ={{ $json.inCohort }}; ={{ $json.Template }}; ={{ ["bug_report", "feature_reques... |
| `conditions.conditions[].rightValue` | 1,163 | str, float, bool, int | ; schema; google |
| `conditions.conditions[].id` | 1,151 | str | 191ec8a1-8105-4e08-9b75-a03c6a514c80; f5ec37ec-884b-4f2b-a862-8f635c3f4787; 1f41... |
| `conditions` | 891 | dict |  |
| `conditions.conditions` | 864 | list |  |
| `options` | 861 | dict |  |
| `conditions.combinator` | 861 | str | and; or |
| `conditions.options` | 860 | dict |  |
| `conditions.options.caseSensitive` | 858 | bool | True; False |
| `conditions.options.typeValidation` | 857 | str | strict; loose |
| `conditions.options.leftValue` | 845 | str |  |
| `conditions.options.version` | 758 | int | 1; 2; 3 |

### `airtable` (1,087 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `columns.schema[].id` | 1,361 | str | id; drive_file_id; file_name |
| `columns.schema[].type` | 1,361 | str | string; number; array |
| `columns.schema[].display` | 1,361 | bool | True |
| `columns.schema[].required` | 1,361 | bool | False |
| `columns.schema[].displayName` | 1,361 | str | id; drive_file_id; file_name |
| `columns.schema[].defaultMatch` | 1,361 | bool | True; False |
| `columns.schema[].readOnly` | 1,358 | bool | True; False |
| `columns.schema[].removed` | 1,344 | bool | True; False |
| `columns.schema[].canBeUsedToMatch` | 1,095 | bool | True; False |
| `table` | 841 | dict, str | Table 1; =Table 1; YOUR TABLE NAME |
| `options` | 814 | dict |  |
| `base` | 788 | dict |  |
| `base.value` | 788 | str | appYnPOyDUwImADqj; appobCAkHxBSApdQ3; appcEbIlJr6Vce1R7 |
| `operation` | 785 | str | search; update; create |
| `table.value` | 780 | str | tbl1s3jAxiwbfaQQO; tblalx8WQPAgA6VVY; tbl8jsh0nMt3F5mo5 |

### `memoryBufferWindow` (1,067 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `sessionIdType` | 536 | str | customKey |
| `sessionKey` | 535 | str | ={{ $('WhatsApp Trigger').item.json.contacts[0].wa_id }}; data; ={{ $now.minute ... |
| `contextWindowLength` | 343 | int, str | 20; 10; 30 |
| `maxTokenLimit` | 1 | int | 4000 |

### `httpRequestTool` (1,055 uses)

| Parameter | Used | Value Types | Sample Values |
|-----------|------|-------------|---------------|
| `options` | 621 | dict |  |
| `url` | 619 | str | https://scraperapi.thordata.com/request; https://api.firecrawl.dev/v1/scrape; ={... |
| `toolDescription` | 530 | str | Send all the info and return the score; HTTP request using Bing Search; HTTP req... |
| `queryParameters.parameters[].name` | 386 | str | interval; apikey; outputsize |
| `queryParameters.parameters[].value` | 383 | str | 1h; {{ADD YOUR API KEY FROM TWELVEDATA HERE}}; 200 |
| `authentication` | 354 | str | predefinedCredentialType; genericCredentialType |
| `genericAuthType` | 255 | str | httpHeaderAuth; httpQueryAuth; httpBearerAuth |
| `method` | 250 | str | POST; PUT; DELETE |
| `headerParameters.parameters[].name` | 204 | str | Authorization; apikey; Prefer |
| `headerParameters.parameters[].value` | 204 | str | =Bearer YOUR_TOKEN_HERE; YOUR_SUPABASE_API_KEY; Bearer YOUR_TOKEN_HERE |
| `sendHeaders` | 193 | bool | True |
| `headerParameters` | 191 | dict |  |
| `headerParameters.parameters` | 191 | list |  |
| `sendQuery` | 188 | bool | True |
| `queryParameters` | 188 | dict |  |
