/**
 * Phase 0: clients, users/members, org roles (departments), employees, onboarding.
 */
import { Rng, bulkInsert, FIRST_EU, LAST_EU, FIRST_US, LAST_US, agoDays, log } from "./util.mjs";
import { TENANTS } from "./tenants.mjs";

export async function seedPhase0(sql, slug) {
  const T = TENANTS[slug];
  const rng = new Rng(slug === "nordwind" ? 101 : 202);
  const isEU = slug === "nordwind";
  const FIRST = isEU ? FIRST_EU : FIRST_US;
  const LAST = isEU ? LAST_EU : LAST_US;

  // --- client ---
  const [client] = await sql`
    INSERT INTO clients ${sql(T.client)}
    RETURNING id`;
  const clientId = client.id;

  // --- demo owner user + membership ---
  const [user] = await sql`
    INSERT INTO users (open_id, name, email, login_method, role, max_clients)
    VALUES (${crypto.randomUUID()}, ${"Demo Owner (" + T.client.name + ")"}, ${"demo+" + slug + "@grcompliance.local"}, 'demo', 'owner', 5)
    RETURNING id`;
  await sql`INSERT INTO user_clients (user_id, client_id, role) VALUES (${user.id}, ${clientId}, 'owner')`;

  // --- org roles = departments with heads ---
  const deptHeadEmails = [];
  const orgRoles = [];
  for (const [title, head] of T.departments) {
    const email = head.toLowerCase().replace(/[^a-z ]/g, "").replace(/ /g, ".") + "@" + (isEU ? "nordwind-logistics.example" : "apexfed.example");
    deptHeadEmails.push(email);
    orgRoles.push({
      client_id: clientId,
      title,
      description: `${title} department of ${T.client.name}. Owns departmental ISMS responsibilities, risk register entries and policy acknowledgments for its staff.`,
      responsibilities: `Departmental risk ownership; security awareness completion; incident first response; asset inventory accuracy.`,
      department: title,
      reporting_role_id: null,
    });
  }
  await bulkInsert(sql, "org_roles",
    ["client_id", "title", "description", "responsibilities", "department", "reporting_role_id"], orgRoles);

  // --- employees ---
  const employees = [];
  const used = new Set();
  const mkPerson = (i) => {
    let fn, ln, email;
    do {
      fn = rng.pick(FIRST); ln = rng.pick(LAST);
      email = `${fn}.${ln}`.toLowerCase().replace(/[^a-z.]/g, "") + "@" +
        (isEU ? "nordwind-logistics.example" : "apexfed.example");
    } while (used.has(email));
    used.add(email);
    return { fn, ln, email };
  };

  // Department heads first (index-aligned to departments array)
  T.departments.forEach(([dept, head], i) => {
    const [fn] = head.split(" ");
    const ln = head.split(" ").slice(1).join(" ");
    const email = deptHeadEmails[i];
    used.add(email);
    employees.push({
      client_id: clientId,
      first_name: fn.replace(/^Dr\.\s*/, ""),
      last_name: ln,
      email,
      job_title: i === 0 ? "Chief Executive Officer" : `${dept} — Department Head`,
      department: dept,
      role: i === 0 ? "admin" : "editor",
      employment_status: "active",
      start_date: agoDays(rng.int(400, 3200)),
    });
  });

  const jobTitlesByDept = {
    default: ["Specialist", "Senior Specialist", "Analyst", "Coordinator", "Associate"],
  };
  for (let i = employees.length; i < T.employeeCount; i++) {
    const p = mkPerson(i);
    const dept = rng.weighted(T.departments.map((d, di) => [d[0], di === 0 ? 2 : di <= 4 ? 14 : 10]));
    employees.push({
      client_id: clientId,
      first_name: p.fn, last_name: p.ln, email: p.email,
      job_title: rng.pick(jobTitlesByDept.default),
      department: dept,
      role: rng.weighted([["viewer", 70], ["editor", 25], ["auditor", 5]]),
      employment_status: rng.chance(0.96) ? "active" : "on_leave",
      start_date: agoDays(rng.int(30, 2600)),
    });
  }
  // managers: dept heads manage their staff
  const headIds = employees.slice(0, T.departments.length);
  employees.forEach((e, i) => {
    if (i >= T.departments.length) {
      const h = headIds.find(h => h.department === e.department);
      e.manager_id = null; // patched after insert below
      e._mgrEmail = h?.email;
    }
  });

  const empCols = ["client_id","first_name","last_name","email","job_title","department","role","employment_status","start_date"];
  await bulkInsert(sql, "employees", empCols, employees);

  // patch manager links (dept heads manage their staff)
  for (const e of employees.filter(x => x._mgrEmail)) {
    await sql`
      UPDATE employees SET manager_id = m.id
      FROM employees m
      WHERE m.client_id = ${clientId} AND m.email = ${e._mgrEmail}
        AND employees.email = ${e.email}`;
  }

  log(`phase0: client=${clientId} user=${user.id} orgRoles=${orgRoles.length} employees=${employees.length}`);
  return { clientId, userId: user.id, employeeCount: employees.length, deptCount: orgRoles.length };
}
