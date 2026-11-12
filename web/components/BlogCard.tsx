import Link from "next/link";
import { blogPath, fmtDate, photoSrcSet, photoUrl, type BlogPost } from "@/lib/blog";

/** Karta článku: fotka, téma, nadpis, krátky popis, dátum a čas čítania. */
export default function BlogCard({ p, priority }: { p: BlogPost; priority?: boolean }) {
  return (
    <article className="bcard">
      <Link href={blogPath(p.slug)} className="bcard-a">
        <span className="bcard-img">
          <img src={photoUrl(p.photo, 640)} srcSet={photoSrcSet(p.photo, [400, 640, 960])} sizes="(max-width:700px) 80vw, 360px" alt={p.photo.alt} loading={priority ? "eager" : "lazy"} decoding="async" width={640} height={400} />
          <span className="bcard-tag">{p.tag}</span>
        </span>
        <span className="bcard-b">
          <b className="bcard-t">{p.title}</b>
          <span className="bcard-d">{p.description}</span>
          <span className="bcard-m">{fmtDate(p.date)} · {p.readMin} min čítania</span>
        </span>
      </Link>
    </article>
  );
}
