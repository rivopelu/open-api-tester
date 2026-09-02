const TOOL_LABELS: Record<string, string> = {
  list_projects: "List projects",
  get_project: "Load project",
  create_project: "Create project",
  list_folders: "List folders",
  create_folder: "Create folder",
  update_folder: "Update folder",
  delete_folder: "Delete folder",
  get_endpoints_by_project: "List endpoints",
  get_endpoint_detail: "Load endpoint detail",
  create_endpoint: "Create endpoint",
  update_endpoint_contract: "Update endpoint",
  move_endpoint: "Move endpoint",
  create_example: "Create example",
  list_mock_examples: "List mock examples",
  simulate_mock_response: "Simulate mock response",
};

export function formatToolLabel(name: string): string {
  if (TOOL_LABELS[name]) return TOOL_LABELS[name];
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
