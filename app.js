const metrics = [
  { label: "Core layers", value: "ERP + MES + PLM" },
  { label: "Critical modules", value: "12" },
  { label: "Starter phases", value: "6 + parallel training" },
  { label: "Highest-impact quick wins", value: "5" }
];

const stack = [
  {
    title: "Level 4 — ERP",
    points: [
      "Sales, purchasing, inventory, finance",
      "Master planning and order commitments",
      "Customer and supplier collaboration"
    ]
  },
  {
    title: "Level 3 — MOM/MES",
    points: [
      "Production dispatching and WIP visibility",
      "Quality checks and defect feedback loops",
      "Downtime, targets vs actual, and line efficiency"
    ]
  },
  {
    title: "Level 2/1/0 — Control",
    points: [
      "Machine signals and manual station input",
      "Barcode/RFID scanning at each movement",
      "Optional PLC/sensor integration"
    ]
  }
];

const workflow = [
  {
    stage: "Product & Pre-Production",
    items: [
      "Style creation, tech pack, grading rules",
      "BOM + routing definitions with versioning",
      "Sample tracking, approvals, and revisions"
    ]
  },
  {
    stage: "Planning",
    items: [
      "Sales order and forecast loading",
      "MRP + capacity planning by line/shift",
      "Cut plans, production orders, subcontract jobs"
    ]
  },
  {
    stage: "Production Execution",
    items: [
      "Fabric receiving, inspection, spreading, and cutting",
      "Bundling/ticketing with unique bundle IDs",
      "Sewing outputs, in-line/final QC, finishing, packing"
    ]
  },
  {
    stage: "Post-Production",
    items: [
      "Shipping and warehouse closure",
      "Returns, repairs, and customer claim handling",
      "Actual costing and continuous improvement actions"
    ]
  }
];

const modules = [
  ["Master Data", "Items, SKUs, work centers, defect and downtime codes"],
  ["PLM / PLM-lite", "Tech packs, BOM/routing revisions, sample approvals"],
  ["Sales & Order Mgmt", "Quotes-to-orders, commitments, compliance rules"],
  ["Procurement", "POs, lead times, price lists, supplier KPIs"],
  ["Inventory / WMS", "Receiving, lot tracking, transfers, cycle counts"],
  ["Planning", "MPS/MRP, reservations, line plans, subcontracting"],
  ["MES", "Operation-level WIP, outputs, rejects, downtime"],
  ["QMS", "Incoming/in-line/final inspection with disposition"],
  ["Maintenance", "Assets, PM schedules, breakdowns, spare parts"],
  ["HR & Incentives", "Shifts, skill matrix, piece-rate calculations"],
  ["Finance & Costing", "Standard vs actual cost, style/order profitability"],
  ["Analytics", "OTIF, OEE, FPY, WIP aging, wastage analysis"]
];

const traceability = [
  "Fabric Roll ID (lot / dye lot)",
  "Bundle ID",
  "Work Order ID",
  "Carton ID",
  "Shipment / SSCC ID"
];

const roadmap = [
  "Phase 0: Process mapping, code dictionaries, and master data cleanup",
  "Phase 1: Inventory + purchasing + basic sales order control",
  "Phase 2: BOM/routing with version approvals + production orders",
  "Phase 3: Cutting + bundling + scan-driven WIP visibility",
  "Phase 4: Sewing MES + in-line QC + downtime capture",
  "Phase 5: Packing/shipping with customer labeling compliance",
  "Phase 6: Costing + analytics + continuous improvement"
];

const starterCore = [
  "Inventory with lot tracking for fabric rolls",
  "Production orders tied to versioned BOM and routing",
  "Bundle IDs with stage-by-stage scan events",
  "In-line quality defect logging",
  "Line output and downtime dashboards"
];

const heroMetrics = document.getElementById("heroMetrics");
const stackGrid = document.getElementById("stackGrid");
const workflowTabs = document.getElementById("workflowTabs");
const workflowContent = document.getElementById("workflowContent");
const modulesGrid = document.getElementById("modulesGrid");
const traceabilityList = document.getElementById("traceabilityList");
const roadmapList = document.getElementById("roadmap");
const starterCoreList = document.getElementById("starterCore");

metrics.forEach(({ label, value }) => {
  const metric = document.createElement("div");
  metric.className = "metric";
  metric.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
  heroMetrics.append(metric);
});

stack.forEach(({ title, points }) => {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `<h3>${title}</h3><ul>${points
    .map((point) => `<li>${point}</li>`)
    .join("")}</ul>`;
  stackGrid.append(card);
});

modules.forEach(([title, desc]) => {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `<h3>${title}</h3><p>${desc}</p>`;
  modulesGrid.append(card);
});

traceability.forEach((item) => {
  const li = document.createElement("li");
  li.textContent = item;
  traceabilityList.append(li);
});

roadmap.forEach((phase) => {
  const li = document.createElement("li");
  li.textContent = phase;
  roadmapList.append(li);
});

starterCore.forEach((item) => {
  const li = document.createElement("li");
  li.textContent = item;
  starterCoreList.append(li);
});

function renderWorkflow(index) {
  workflowContent.innerHTML = `<h3>${workflow[index].stage}</h3><ul>${workflow[
    index
  ].items
    .map((item) => `<li>${item}</li>`)
    .join("")}</ul>`;

  [...workflowTabs.children].forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === index);
  });
}

workflow.forEach((entry, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tab";
  button.textContent = entry.stage;
  button.addEventListener("click", () => renderWorkflow(index));
  workflowTabs.append(button);
});

renderWorkflow(0);
