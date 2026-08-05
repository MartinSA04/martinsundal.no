---
index: 2
name: NTNU Course Data API & MCP Server
tagline: One typed interface over NTNU's scattered public course data, plus an MCP server that puts it in front of an LLM.
summary: A zero-dependency TypeScript client wrapping three public NTNU data sources, and a remote MCP server on Cloudflare Workers exposing twelve read-only tools.
world:
  sub: "#0c0d0f"
  ink: "#e8e6e1"
  hair: "#3a3c40"
  sig: "#ffb000"
spec:
  - label: Package
    value: ntnu-api on npm
  - label: Runtime deps
    value: Zero
  - label: Runs in
    value: Node 20+ · Workers · browsers
  - label: MCP tools
    value: 12, all read-only
  - label: MCP endpoint
    value: ntnu-mcp.martinsundal.no/mcp
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
dateModified: "2026-07-28"
---

## The problem

NTNU's course data is public, unauthenticated, and scattered across three
systems that do not know about each other. Course pages serve JSON from
Liferay, but exam logistics exist only as HTML. Grade statistics
live at HK-dir. Term ids and teaching weeks come from the TP timetable
system. Nothing shares an identifier scheme.

## The client

`ntnu-api` puts all of it behind one typed interface, fetch-based, with zero
runtime dependencies, so it runs unchanged in Node, in a browser, and in a
Cloudflare Worker.

| Namespace | Data | Source |
| --- | --- | --- |
| `courses` | catalog search, schedules, weekly timetables | ntnu.no JSON |
| `courses.details` | exams, fact box, descriptions, programs | ntnu.no HTML, scraped |
| `grades` | grade distribution per course, year, semester | HK-dir DBH |
| `programs` | ~400 study programs, per-cohort study plans | ntnu.no JSON |
| `semesters` | term ids, teaching weeks, exam periods | TP |

The awkward parts are the interesting parts. Exam information has no JSON
upstream at all, so it is scraped from the course page and typed on the way
out. Catalog search returns duplicate entries, so `searchAll` dedups them.
Grade lookups need DBH-versioned codes like `TDT4100-1`, so
`get_course_versions` exists to bridge the two naming schemes.

## The MCP server

`ntnu-mcp` runs the client as a remote MCP server on a Cloudflare Worker.
Twelve read-only tools, no installation, no authentication, because it only
serves public data.

Two of them are the reason it exists. `compare_courses` lines candidates up
side by side with exam dates, weekly teaching hours and recent grade
distributions. `check_timetable_conflicts` catches weekly clashes and exam
collisions across a set of courses **before** you register, which is the
question every student actually has and no official tool answers.

## Try it

The console on this page is a real MCP client, written by hand, talking to
that server right now. Not a recording.
