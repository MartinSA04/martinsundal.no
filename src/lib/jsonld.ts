/**
 * JSON-LD graph builders.
 *
 * Kept as pure functions with no Astro imports so they are unit-testable
 * without a browser or a build. Every node that needs the author references
 * personNode()["@id"] instead of inlining a second copy of the person — a
 * duplicated Person is the usual way a @graph ends up self-contradicting.
 */
import { isoDateTime } from "./datetime.ts";
import type { Project } from "./schema.ts";

export const SITE = "https://martinsundal.no";

const PERSON_ID = `${SITE}/#martin-sundal-aspas`;
const WEBSITE_ID = `${SITE}/#website`;
const PROFILE_ID = `${SITE}/#profile-page`;
const PROJECTS_ID = `${SITE}/#projects`;

const abs = (path: string) => `${SITE}${path}`;

export interface VideoMeta {
  name: string;
  description: string;
  thumbnailUrl: string;
  /** A calendar day, YYYY-MM-DD; isoDateTime() gives it the timezone. */
  uploadDate: string;
  duration: string;
  contentUrl: string;
}

interface ProjectEntry {
  id: string;
  data: Project;
}

export function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Martin Sundal Aspås",
    alternateName: "Martin Sundal Aspas",
    givenName: "Martin",
    additionalName: "Sundal",
    familyName: "Aspås",
    url: `${SITE}/`,
    mainEntityOfPage: { "@id": PROFILE_ID },
    jobTitle: "Software Engineer",
    description:
      "Software engineer in Trondheim focused on robotics, simulation, industrial software, data and machine learning systems, and system architecture.",
    email: "mailto:martin.s.aspas@gmail.com",
    knowsLanguage: ["nb", "en"],
    nationality: { "@type": "Country", name: "Norway" },
    hasOccupation: {
      "@type": "Occupation",
      name: "Software Engineer",
      occupationLocation: { "@type": "City", name: "Trondheim" },
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      "@id": "https://www.ntnu.edu/#organization",
      name: "Norwegian University of Science and Technology",
      alternateName: "NTNU",
      url: "https://www.ntnu.edu/",
      sameAs:
        "https://en.wikipedia.org/wiki/Norwegian_University_of_Science_and_Technology",
    },
    /* alumniOf alone reads as finished. The degree is in progress, so the
       enrolment is stated separately as the programme itself. */
    affiliation: { "@id": "https://www.ntnu.edu/#organization" },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: "Integrated MSc, Applied Physics and Mathematics",
      credentialCategory: "degree",
      educationalLevel: "Master",
      about: "Quantum Technology",
      recognizedBy: { "@id": "https://www.ntnu.edu/#organization" },
    },
    worksFor: {
      "@type": "Organization",
      "@id": "https://www.akersolutions.com/#organization",
      name: "Aker Solutions",
      url: "https://www.akersolutions.com/",
      sameAs: "https://en.wikipedia.org/wiki/Aker_Solutions",
    },
    award:
      "Best Project, TDT4102 Procedural and Object-Oriented Programming, NTNU",
    knowsAbout: [
      "C++",
      "Python",
      "TypeScript",
      "Robotics",
      "Simulation",
      "Industrial software",
      "Machine learning",
      "Data engineering",
      "System architecture",
      "Physics",
      "Mathematics",
      "Quantum technology",
      "Quantum computing",
      "Quantum mechanics",
    ],
    sameAs: [
      "https://linkedin.com/in/martinsa04",
      "https://github.com/MartinSA04",
      "https://www.npmjs.com/~martinsa04",
      "https://www.buymeacoffee.com/martinsa04",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Trondheim",
      addressCountry: "NO",
    },
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE}/`,
    name: "Martin Sundal Aspås",
    description:
      "Portfolio site for Martin Sundal Aspås, software engineer and NTNU student.",
    publisher: { "@id": PERSON_ID },
    inLanguage: "en",
  };
}

function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

/** The visible <Breadcrumbs> renders from this same array, so they cannot disagree. */
export function projectTrail(p: Project, slug: string) {
  return [
    { name: "Home", path: "/" },
    { name: p.name, path: `/projects/${slug}/` },
  ];
}

export function workTrail() {
  return [
    { name: "Home", path: "/" },
    { name: "Work", path: "/work/" },
  ];
}

function softwareNode(p: Project, slug: string) {
  return {
    "@type": "SoftwareSourceCode",
    "@id": `${SITE}/projects/${slug}/#software`,
    name: p.name,
    description: p.summary,
    url: abs(`/projects/${slug}/`),
    ...(p.repo ? { codeRepository: p.repo } : {}),
    programmingLanguage: p.languages,
    ...(p.award ? { award: p.award } : {}),
    ...(p.image ? { image: abs(p.image.src) } : {}),
    dateCreated: isoDateTime(p.datePublished),
    dateModified: isoDateTime(p.dateModified),
    author: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID },
  };
}

export function homeGraph(projects: ProjectEntry[]) {
  /* The home page indexes the projects and has no date of its own, so its
     freshness is the freshest thing it lists — the same rule /sitemap.xml
     applies to the same URL, so the two cannot disagree. Notably not
     build-time "today": that would restate itself on every deploy. */
  const newest = projects.reduce<string | undefined>(
    (max, p) => (!max || p.data.dateModified > max ? p.data.dateModified : max),
    undefined,
  );

  return {
    "@context": "https://schema.org",
    "@graph": [
      personNode(),
      websiteNode(),
      {
        "@type": "ProfilePage",
        "@id": PROFILE_ID,
        url: `${SITE}/`,
        name: "Martin Sundal Aspås | Software Engineer, Robotics & Simulation",
        description:
          "Software engineer in Trondheim. Robotics and simulation at Aker Solutions; Applied Physics and Mathematics at NTNU, specializing in quantum technology.",
        inLanguage: "en",
        dateCreated: isoDateTime("2025-02-15"),
        ...(newest ? { dateModified: isoDateTime(newest) } : {}),
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { "@id": PERSON_ID },
        about: { "@id": PERSON_ID },
        hasPart: { "@id": PROJECTS_ID },
      },
      {
        "@type": "ItemList",
        "@id": PROJECTS_ID,
        name: "Projects by Martin Sundal Aspås",
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: projects.length,
        itemListElement: projects.map((entry, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: softwareNode(entry.data, entry.id),
        })),
      },
    ],
  };
}

export function projectGraph(p: Project, slug: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE}/projects/${slug}/#webpage`,
        url: abs(`/projects/${slug}/`),
        name: `${p.name} | Martin Sundal Aspås`,
        description: p.tagline,
        inLanguage: "en",
        datePublished: isoDateTime(p.datePublished),
        dateModified: isoDateTime(p.dateModified),
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${SITE}/projects/${slug}/#software` },
        author: { "@id": PERSON_ID },
        ...(p.image
          ? {
              primaryImageOfPage: {
                "@type": "ImageObject",
                url: abs(p.image.src),
                width: p.image.width,
                height: p.image.height,
                caption: p.image.alt,
              },
            }
          : {}),
      },
      softwareNode(p, slug),
      breadcrumbs(projectTrail(p, slug)),
    ],
  };
}

export function workGraph(video: VideoMeta | null) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE}/work/#webpage`,
        url: abs("/work/"),
        name: "Work | Martin Sundal Aspås",
        description:
          "Martin Sundal Aspås works on the welding planner for a robotised production line at Aker Solutions in Verdal, as part of the small tech team that owns the line's software.",
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": PERSON_ID },
        author: { "@id": PERSON_ID },
      },
      breadcrumbs(workTrail()),
      ...(video
        ? [
            {
              "@type": "VideoObject",
              "@id": `${SITE}/work/#vpl-video`,
              name: video.name,
              description: video.description,
              thumbnailUrl: video.thumbnailUrl,
              uploadDate: isoDateTime(video.uploadDate),
              duration: video.duration,
              contentUrl: video.contentUrl,
              // The footage is Aker's, not mine. Say so in the structured data
              // as well as on the page.
              copyrightHolder: {
                "@type": "Organization",
                "@id": "https://www.akersolutions.com/#organization",
                name: "Aker Solutions",
                url: "https://www.akersolutions.com/",
              },
              isPartOf: { "@id": `${SITE}/work/#webpage` },
            },
          ]
        : []),
    ],
  };
}
