import Head from "next/head";
import { API_URL, GOOGLE_FOR_JOB_KEY } from "../../config";
import Script from "next/script";

//https://developers.google.com/search/docs/data-types/job-posting?hl=fr
//search.google.com/test/rich-results?utm_campaign=devsite&utm_medium=jsonld&utm_source=job-posting

const Page = ({ mission }) => {
  if (!mission) return <div />;

  const postedDate = new Date(mission.postedAt || mission.createdAt);
  const endDate = new Date(mission.endAt);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: mission.title,
    description: mission.descriptionHtml || mission.description,
    employmentType: "VOLUNTEER",
    datePosted: postedDate.toISOString().slice(0, 10),
    validThrough: endDate.toISOString().slice(0, 16),
    hiringOrganization: {
      "@type": "Organization",
      name: mission.organizationName || mission.publisherName,
      sameAs: mission.organizationUrl || mission.publisherUrl,
      logo: mission.organizationLogo || mission.publisherLogo,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: mission.address || mission.adresse,
        addressLocality: mission.city,
        addressRegion: mission.region,
        postalCode: mission.postalCode,
        addressCountry: mission.country,
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: { "@type": "QuantitativeValue", value: 0, unitText: "HOUR" },
    },
    jobLocationType: mission.remote === "full" ? "TELECOMMUTE" : undefined,
    qualifications: mission.soft_skills.join(", "),
    responsibilities: mission.tasks.join(", "),
    industry: mission.domain,
    workHours: mission.schedule,
    applicantLocationRequirements: mission.location
      ? {
          "@type": "Place",
          geo: {
            "@type": "GeoCoordinates",
            latitude: mission.location.lat,
            longitude: mission.location.lon,
          },
        }
      : undefined,
  };

  return (
    <Head>
      <title>{mission.organizationName}</title>
      <meta name="description" content={mission.description} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>
  );
};

export const getServerSideProps = async (context) => {
  let mission = null;
  try {
    console.log(context.params.id);

    const response = await fetch(`${API_URL}/v0/mission/${context.params.id}`, {
      method: "GET",
      headers: { apikey: GOOGLE_FOR_JOB_KEY },
    }).then((e) => e.json());
    mission = response.data;
  } catch (error) {
    console.error(error);
  }

  const userAgent = context.req.headers["user-agent"] || "";
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

  if (!isBot && mission.applicationUrl) {
    return {
      redirect: {
        destination: mission.applicationUrl,
        permanent: false,
      },
    };
  }

  return { props: { mission } };
};

export default Page;
