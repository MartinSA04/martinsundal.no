---
index: 2
name: NTNU Course Data API & MCP Server
tagline: Built to be able to ask Claude when the exams are. A typed client over NTNU's three course-data systems, and an MCP server in front of it.
summary: A zero-dependency TypeScript client wrapping three public NTNU data sources, and a remote MCP server on Cloudflare Workers exposing twelve read-only tools.
world:
  sub: "#0d1014"
  ink: "#dde3ea"
  hair: "#262d36"
  sig: "#5cd6b8"
spec:
  - label: Package
    value: ntnu-api on npm
  - label: Runtime deps
    value: Zero
  - label: Runs in
    value: Node 20+ · Workers · browsers
  - label: MCP tools
    value: 12, all read-only
  - label: Registry
    value: io.github.MartinSA04/ntnu-mcp
tags:
  - TypeScript
  - MCP
  - Cloudflare Workers
  - npm package
links:
  - label: ntnu-api on npm
    href: https://www.npmjs.com/package/ntnu-api
    primary: true
  - label: ntnu-api on GitHub
    href: https://github.com/MartinSA04/ntnu-api
  - label: ntnu-mcp on GitHub
    href: https://github.com/MartinSA04/ntnu-mcp
repo: https://github.com/MartinSA04/ntnu-api
live: https://www.npmjs.com/package/ntnu-api
languages:
  - TypeScript
datePublished: "2026-04-20"
dateModified: "2026-08-09"
---

## Why it exists

To be able to ask Claude about the schedule. That is the whole reason.

NTNU's course data is public but not in a state to be looked up: three systems
that were never introduced to each other and agree on nothing, including how a
course is identified. Exam logistics are not data in any of them — they are
published on the course page as HTML. So `ntnu-api` turns the sources into one
thing to query, and `ntnu-mcp` puts that where a model can reach it.

## The client

TypeScript over `fetch` with nothing underneath it. One build has to run in
Node, in a browser tab and inside Cloudflare's runtime, so it carries no
dependencies at all.

| Namespace | Data | Source |
| --- | --- | --- |
| `courses` | catalog search, schedules, weekly timetables | ntnu.no JSON |
| `courses.details` | exams, fact box, descriptions, programs | ntnu.no HTML, scraped |
| `grades` | grade distribution per course, year, semester | HK-dir DBH |
| `programs` | ~400 study programs, per-cohort study plans | ntnu.no JSON |
| `semesters` | term ids, teaching weeks, exam periods | TP |

The work is in the seams. Exam information is scraped and typed on the way out.
Catalog search hands back the same course twice. Grade lookups want `TDT4100-1`
where the rest of NTNU says `TDT4100`.

## The MCP server

Twelve read-only tools on a Cloudflare Worker, over Streamable HTTP, no key.
Two of them do something the catalog will not: `compare_courses` puts
candidates side by side, and `check_timetable_conflicts` finds clashing
lectures and colliding exams, separating lecture against lecture — fatal — from
a clash with an exercise group that usually has another slot going.

## The console

A real MCP client in eighty lines of `fetch`, with no model behind it. That is
why it asks in fill-in-the-blank sentences: the sentence chooses the tool and
the blanks are the arguments. Put your own codes in and the call is the one
Claude would make.
