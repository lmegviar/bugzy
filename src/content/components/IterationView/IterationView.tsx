import React from "react";
import { BugList } from "../BugList/BugList";
import { useBugFetcher, Bug } from "../../hooks/useBugFetcher";
import { Container } from "../ui/Container/Container";
import { getIteration } from "../../../common/iterationUtils";
import { Tabs } from "../ui/Tabs/Tabs";
import { CompletionBar } from "../CompletionBar/CompletionBar";

const currentIterationInformation = getIteration();

interface GetQueryOptions {
  iteration: string;
  metas: Array<{
    id: string;
    component: string;
    priority?: string;
    displayName?: string;
  }>;
  components: string[];
}

const COLUMNS = ["id", "summary", "assigned_to", "priority"];

const getQuery = (options: GetQueryOptions) => ({
  include_fields: [
    "id",
    "summary",
    "assigned_to",
    "priority",
    "status",
    "whiteboard",
    "keywords",
    "type",
    "flags",
    "blocks",
    "component",
  ],
  rules: [
    { key: "cf_fx_iteration", operator: "substring", value: options.iteration },
    {
      operator: "OR",
      rules: [
        {
          key: "blocked",
          operator: "anywordssubstr",
          value: options.metas
            .filter(m => options.components.includes(m.component))
            .map(m => m.id)
            .join(","),
        },
        {
          key: "component",
          operator: "anyexact",
          value: options.components.join(","),
        },
      ],
    },
  ],
});

interface BugProps {
  id: any;
  summary: string;
  assigned_to?: string;
  priority?: string;
  status?: string;
  whiteboard?: string;
  keywords?: string;
  type?: string;
  flags?: string;
  blocks?: string;
  component: string;
}

function computeHeading(iteration: string): string {
  const isCurrent = iteration === currentIterationInformation.number;
  return `${isCurrent ? "Current " : ""}Iteration (${iteration})`;
}

interface MetaBug {
  id: string;
  component?: string;
  priority?: string;
  displayName?: string;
}

interface GetSortOptions {
  metas: Array<MetaBug>;
  bugs: any[];
}

interface SortByMetaReturn {
  [metaNumber: string]: { meta: MetaBug; bugs: Bug[] };
}

function sortByMeta(allMetas: Array<MetaBug>, bugs: any[]): SortByMetaReturn {
  let bugsByMeta = {};

  bugs.forEach(bug => {
    const metas = allMetas.filter(
      meta => meta.priority === "P1" && bug.blocks.includes(meta.id)
    );
    if (!metas.length) {
      metas.push({ id: "other", displayName: "Other" });
    }

    metas.forEach(meta => {
      if (!bugsByMeta[meta.id]) {
        bugsByMeta[meta.id] = { meta, bugs: [] };
      }
      bugsByMeta[meta.id].bugs.push(bug);
    });
  });
  return bugsByMeta;
}

interface IterationViewProps {
  /* e.g. "65.4" */
  iteration: string;
  /* Metas for all bugzy stuff */
  metas: Array<{
    id: string;
    component: string;
    priority?: string;
    displayName?: string;
  }>;
  match: { url: string };
}

interface IterationViewTabProps extends IterationViewProps {
  components: string[];
}

const IterationViewTab: React.FunctionComponent<
  IterationViewTabProps
> = props => {
  const query = getQuery(props);
  const state = useBugFetcher({
    query,
    updateOn: [],
  });

  const bugsByMeta = sortByMeta(props.metas, state.bugs);
  const isLoaded = state.status === "loaded";
  const isCurrent = props.iteration === currentIterationInformation.number;
  return isLoaded ? (
    <React.Fragment>
      {isCurrent ? (
        <CompletionBar
          startDate={currentIterationInformation.start}
          endDate={currentIterationInformation.due}
          bugs={state.bugs}
        />
      ) : null}
      <div style={{ marginTop: "20px" }}>
        {Object.keys(bugsByMeta).map(id => {
          const { meta, bugs } = bugsByMeta[id];
          return (
            <BugList
              key={meta.id}
              compact={true}
              subtitle={meta.displayName}
              tags={true}
              bulkEdit={true}
              showHeaderIfEmpty={true}
              bugs={bugs}
              columns={COLUMNS}
            />
          );
        })}
      </div>
    </React.Fragment>
  ) : (
    <p>Loading...</p>
  );
};

export const IterationView: React.FunctionComponent<
  IterationViewProps
> = props => {
  return (
    <Container loaded={true} heading={computeHeading(props.iteration)}>
      <Tabs
        baseUrl={props.match.url}
        config={[
          {
            path: "",
            label: "User Journey",
            render() {
              return (
                <IterationViewTab
                  {...props}
                  metas={props.metas}
                  components={["Messaging System"]}
                />
              );
            },
          },
          {
            path: "/pocket",
            label: "Pocket",
            render() {
              return (
                <IterationViewTab
                  {...props}
                  metas={props.metas}
                  components={["New Tab Page"]}
                />
              );
            },
          },
        ]}
      />
    </Container>
  );
};
