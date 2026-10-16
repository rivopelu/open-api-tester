import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Search, Trash2, X } from "lucide-react";
import { Button, Input, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Typography } from "./ui";
import { cn } from "../lib/utils";
import { getErrorMessage, type JiraIssueMatchDto, type JiraStatusCategory } from "../lib/api";
import { jiraLinkRepository } from "../repositories/jira-link.repository";
import { jiraRepository } from "../repositories/jira.repository";
import { jiraLinkQueryKeys } from "../queries/project.queries";

interface Props {
  endpointId: string;
}

function statusCategoryTone(statusCategory: JiraStatusCategory): string {
  if (statusCategory === "done") return "border-success/40 bg-success/10 text-success";
  if (statusCategory === "indeterminate") return "border-warning/40 bg-warning/10 text-warning";
  return "border-primary/40 bg-primary/10 text-primary";
}

export function EndpointJiraLinks({ endpointId }: Props) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIssues, setSelectedIssues] = useState<JiraIssueMatchDto[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const { data: links = [], isLoading } = useQuery({
    queryKey: jiraLinkQueryKeys.byEndpoint(endpointId),
    queryFn: () => jiraLinkRepository.listByEndpoint(endpointId),
  });

  const linkedKeys = new Set(links.map((link) => link.issueKey));
  const selectedKeys = new Set(selectedIssues.map((issue) => issue.key));

  const searchQuery = useQuery({
    queryKey: ["jira-issue-search", debouncedSearch],
    queryFn: () => jiraRepository.searchIssues(debouncedSearch),
    enabled: addOpen && debouncedSearch.length > 1,
    retry: false,
    staleTime: 30_000,
  });

  const searchResults = (searchQuery.data ?? []).filter(
    (issue) => !linkedKeys.has(issue.key) && !selectedKeys.has(issue.key),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: jiraLinkQueryKeys.byEndpoint(endpointId) });

  const addSelected = (issue: JiraIssueMatchDto) => {
    setSelectedIssues((prev) => (prev.some((i) => i.key === issue.key) ? prev : [...prev, issue]));
    setSearchInput("");
  };

  const removeSelected = (key: string) => {
    setSelectedIssues((prev) => prev.filter((issue) => issue.key !== key));
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const trimmed = searchInput.trim().toUpperCase();
    if (!trimmed || linkedKeys.has(trimmed) || selectedKeys.has(trimmed)) return;
    addSelected({ key: trimmed, summary: "" });
  };

  const batchCreateMutation = useMutation({
    mutationFn: async () => {
      const issues = selectedIssues;
      const outcomes = await Promise.allSettled(
        issues.map((issue) => jiraLinkRepository.create(endpointId, { issueKey: issue.key })),
      );
      return issues.map((issue, index) => ({ issue, outcome: outcomes[index] }));
    },
    onSuccess: (results) => {
      void invalidate();
      const failed = results.filter(({ outcome }) => outcome.status === "rejected");
      if (failed.length === 0) {
        closeAddModal();
        return;
      }
      setSelectedIssues(failed.map(({ issue }) => issue));
      setFormError(
        failed
          .map(
            ({ issue, outcome }) =>
              `${issue.key}: ${getErrorMessage((outcome as PromiseRejectedResult).reason, "Failed to add")}`,
          )
          .join("; "),
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (linkId: string) => jiraLinkRepository.remove(endpointId, linkId),
    onSuccess: () => void invalidate(),
  });

  const closeAddModal = useCallback(() => {
    setAddOpen(false);
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedIssues([]);
    setFormError(null);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <Typography variant="label" tone="muted">
          Linked Jira cards
        </Typography>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span>Add Jira link</span>
        </Button>
      </div>

      {isLoading && (
        <Typography variant="caption" tone="muted">
          Loading…
        </Typography>
      )}

      {!isLoading && links.length === 0 && (
        <Typography variant="caption" tone="muted">
          No Jira cards linked to this endpoint yet.
        </Typography>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex min-w-0 items-start gap-2 border border-border bg-surface px-3 py-2"
          >
            <button
              type="button"
              onClick={() => window.open(link.issueUrl, "_blank", "noopener,noreferrer")}
              className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
              title="Open in Jira"
            >
              <span className="flex items-center gap-1.5">
                {link.category && (
                  <span className="border border-border px-1 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-text-muted">
                    {link.category}
                  </span>
                )}
                <span className="font-mono text-xs font-bold text-text-primary">{link.issueKey}</span>
                <ExternalLink className="h-3 w-3 text-text-muted" aria-hidden="true" />
              </span>
              {link.jira ? (
                <>
                  <span
                    className={cn(
                      "border px-1 py-0.5 font-mono text-[9px] font-bold",
                      statusCategoryTone(link.jira.statusCategory),
                    )}
                  >
                    {link.jira.status}
                  </span>
                  <span className="block w-full min-w-0 self-stretch truncate text-xs text-text-secondary">
                    {link.jira.summary}
                  </span>
                  {link.jira.assignee && (
                    <span className="text-[10px] text-text-muted">{link.jira.assignee}</span>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-text-muted">{link.jiraError ?? "Unavailable"}</span>
              )}
            </button>
            <button
              type="button"
              aria-label="Remove Jira link"
              onClick={() => removeMutation.mutate(link.id)}
              className="ml-auto shrink-0 text-text-muted transition-colors hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Modal open={addOpen} onClose={closeAddModal} size="sm">
        <ModalHeader>
          <ModalTitle>Add Jira link</ModalTitle>
        </ModalHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);
            batchCreateMutation.mutate();
          }}
        >
          <ModalBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Input
                label="Search Jira issues"
                placeholder="Type a key or summary…"
                leadingIcon={<Search className="h-3.5 w-3.5" />}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={handleSearchKeyDown}
              />

              {debouncedSearch.length > 1 && (
                <div className="max-h-40 overflow-y-auto border border-border bg-overlay">
                  {searchQuery.isFetching && (
                    <Typography variant="caption" tone="muted" className="block px-3 py-2">
                      Searching…
                    </Typography>
                  )}
                  {!searchQuery.isFetching && searchQuery.isError && (
                    <Typography variant="caption" tone="muted" className="block px-3 py-2">
                      Autocomplete unavailable ({getErrorMessage(searchQuery.error, "search failed")}) — press Enter
                      to add the exact issue key.
                    </Typography>
                  )}
                  {!searchQuery.isFetching && !searchQuery.isError && searchResults.length === 0 && (
                    <Typography variant="caption" tone="muted" className="block px-3 py-2">
                      No matching issues.
                    </Typography>
                  )}
                  {!searchQuery.isFetching &&
                    searchResults.map((issue) => (
                      <button
                        key={issue.key}
                        type="button"
                        onClick={() => addSelected(issue)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-primary/10"
                      >
                        <span className="shrink-0 font-mono text-xs font-bold text-text-primary">{issue.key}</span>
                        <span className="truncate text-xs text-text-secondary">{issue.summary}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {selectedIssues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedIssues.map((issue) => (
                  <span
                    key={issue.key}
                    className="flex items-center gap-1.5 border border-border bg-surface px-2 py-1"
                  >
                    <span className="font-mono text-[11px] font-bold text-text-primary">{issue.key}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${issue.key}`}
                      onClick={() => removeSelected(issue.key)}
                      className="text-text-muted hover:text-danger"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {formError && (
              <Typography variant="caption" tone="danger">
                {formError}
              </Typography>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button type="submit" loading={batchCreateMutation.isPending} disabled={selectedIssues.length === 0}>
              Add {selectedIssues.length > 0 ? selectedIssues.length : ""} card
              {selectedIssues.length === 1 ? "" : "s"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
