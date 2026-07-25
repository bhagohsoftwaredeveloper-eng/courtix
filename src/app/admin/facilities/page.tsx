import Link from "next/link";
import { DashHeader, KpiRow, Panel, Table, Td } from "@/components/dashboard/parts";
import { COURTS, allCities } from "@/lib/data/courts";
import { sportName } from "@/lib/data/sports";
import { peso } from "@/lib/format";

export const metadata = { title: "Facilities" };

export default function AdminFacilitiesPage() {
  const cities = allCities();

  return (
    <>
      <DashHeader
        title="Facilities"
        sub={`${COURTS.length} listed venues across ${cities.length} cities`}
        action={<button className="btn btn-ghost">Add facility</button>}
      />

      <KpiRow
        items={[
          { label: "Listed venues", value: String(COURTS.length) },
          { label: "Indoor", value: String(COURTS.filter((c) => c.indoor).length) },
          {
            label: "Avg. rate",
            value: peso(Math.round(COURTS.reduce((s, c) => s + c.price, 0) / COURTS.length)),
          },
          {
            label: "Avg. rating",
            value: (COURTS.reduce((s, c) => s + c.rating, 0) / COURTS.length).toFixed(2),
          },
        ]}
      />

      <Panel title="All facilities">
        <Table head={["Facility", "Sport", "City", "Rate", "Units", "Rating", "Type", ""]}>
          {COURTS.map((c) => (
            <tr key={c.id}>
              <Td>
                {c.name}
                <span className="block text-[10.5px] text-muted">{c.host}</span>
              </Td>
              <Td>{sportName(c.sport)}</Td>
              <Td>{c.city}</Td>
              <Td mono>{peso(c.price)}</Td>
              <Td mono>{c.units}</Td>
              <Td mono>
                ★ {c.rating.toFixed(1)}
                <span className="text-muted"> ({c.reviewCount})</span>
              </Td>
              <Td>
                <span className={`status-chip ${c.indoor ? "status-open" : "status-pending"}`}>
                  {c.indoor ? "Indoor" : "Outdoor"}
                </span>
              </Td>
              <Td>
                <Link href={`/courts/${c.slug}`} className="text-[11.5px] font-bold text-ball-yellow">
                  View
                </Link>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Coverage by city">
        <Table head={["City", "Venues", "Sports covered"]}>
          {cities.map((city) => {
            const inCity = COURTS.filter((c) => c.city === city);
            const sports = [...new Set(inCity.map((c) => sportName(c.sport)))];
            return (
              <tr key={city}>
                <Td>{city}</Td>
                <Td mono>{inCity.length}</Td>
                <Td>{sports.join(", ")}</Td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </>
  );
}
