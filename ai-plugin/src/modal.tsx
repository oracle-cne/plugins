import { Icon } from '@iconify/react';
import {
  Drawer,
  Box,
  Grid,
  Chip,
  Paper,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';
import { useGlobalState } from './utils';
import TextStreamContainer from './textstream';
import OpenAIManager from './openai/manager';
import AIManager, { Prompt } from './ai/manager';
import {
  ActionButton,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';

const maxCharLimit = 3000;

function summarizeKubeObject(obj) {
  if (obj.kind === 'Event') {
    return {
      kind: obj.kind,
      metadata: {
        name: obj.metadata.name,
        namespace: obj.metadata.namespace,
      },
      involvedObject: {
        kind: obj.involvedObject.kind,
        name: obj.involvedObject.name,
        namespace: obj.involvedObject.namespace,
      },
      reason: obj.reason,
    };
  }

  const summarizedObj = {
    kind: obj.kind,
    metadata: {
      name: obj.metadata.name,
      namespace: obj.metadata.namespace,
    },
  };

  if (obj.metadata.namespace) {
    summarizedObj.metadata['namespace'] = obj.metadata.namespace;
  }

  return summarizedObj;
}

function summarizeKubeObjectIfNeeded(obj) {
  const objsData = {
    object: obj,
    summarized: false,
  };
  let objStr = JSON.stringify(obj);
  // @todo: We should measure the number of tokens, but we count the chars for now which
  // will "almost certainly" be less than the token count.
  if (objStr.length < maxCharLimit) {
    return objsData;
  }

  // Remove the annotations from this k8s object
  let simplifiedObj = {
    ...obj,
  };
  if (simplifiedObj.metadata?.annotations) {
    delete simplifiedObj.metadata.annotations;
  }
  if (simplifiedObj.metadata?.managedFields) {
    delete simplifiedObj.metadata.managedFields;
  }

  objStr = JSON.stringify(simplifiedObj);
  if (objStr.length >= maxCharLimit) {
    simplifiedObj = summarizeKubeObject(obj);
    // If the very simplified object is under the limit, try including
    // the spec (if it applies).
    if (JSON.stringify(simplifiedObj).length < maxCharLimit) {
      if (!!obj.spec) {
        let simplifiedObjWithSpec = {...simplifiedObj};
        simplifiedObjWithSpec.spec = obj.spec

        if (JSON.stringify(simplifiedObjWithSpec).length < maxCharLimit) {
          simplifiedObj = simplifiedObjWithSpec;
        }
      }
    }
  }

  objsData.object = simplifiedObj;
  objsData.summarized = true;
  return objsData;
}

function summarizeKubeObjectListIfNeeded(objList) {
  const objsListData = {
    list: objList,
    summarized: false,
  };
  const objListStr = JSON.stringify(objList);
  // @todo: We should measure the number of tokens, but we count the chars for now which
  // will "almost certainly" be less than the token count.
  if (objListStr.length < maxCharLimit) {
    return objsListData;
  }

  objsListData.list = objList.map(summarizeKubeObject);
  objsListData.summarized = true;
  return objsListData;
}

function getWarningsContext(events): [string, ReturnType<typeof summarizeKubeObjectListIfNeeded>] {
  const warnings = events.filter(e => e.type === 'Warning').map(e => e.jsonData);
  return ['clusterWarnings', summarizeKubeObjectListIfNeeded(warnings)];
}

export default function AIPrompt(props: {
  openPopup: boolean;
  setOpenPopup: (...args) => void;
  isAzureOpenAI: boolean;
  openApiName: string;
  openApiKey: string;
  gptModel: string;
}) {
  const { openPopup, setOpenPopup, isAzureOpenAI } = props;

  const [promptError] = React.useState(false);
  const rootRef = React.useRef(null);
  const [promptVal, setPromptVal] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState(null);
  const [aiManager, setAiManager] = React.useState<AIManager | null>(null);
  const _pluginSetting = useGlobalState();
  const [promptHistory, setPromptHistory] = React.useState<Prompt[]>([]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (isAzureOpenAI && !aiManager) {
      setAiManager(new OpenAIManager());
  //   aiManager = new OpenAI({ apiKey: openApiKey, dangerouslyAllowBrowser: true });

    }
  },
  [isAzureOpenAI, aiManager])

  const updateHistory = React.useCallback(() => {
    setPromptHistory(aiManager?.history ?? []);
  },
  [aiManager]);

  React.useEffect(() => {
    if (!aiManager) {
      return;

    }
    const ctx = {};

    const event = _pluginSetting.event;
    const items = event?.items;
    const resource = event?.resource;
    const title = event?.title || event?.type;

    const events = event?.objectEvent?.events;
    if (!!events) {
      const [contextId, warnings] = getWarningsContext(events);
      aiManager.addContext(contextId, warnings);
    }

    if (!!items) {
      const objList = summarizeKubeObjectListIfNeeded(items);
      aiManager.addContext('resourceList', {
        ...objList,
        listKind: title,
      });
    }

    if (!!resource) {
      const resourceName = !!title ? `${title} details` : 'resource details';
      ctx[resourceName] = resource;
      aiManager.addContext('resourceDetails', summarizeKubeObjectIfNeeded(resource));
    }

    setSuggestions(aiManager.getPromptSuggestions());
  },
  [_pluginSetting.event, aiManager]);

  async function AnalyzeResourceBasedOnPrompt(prompt: string) {
    setOpenPopup(true);
    setLoading(true);
    // @todo: Needs to be cancellable.
    let promptResponse = await aiManager.userSend(prompt);

    setLoading(false);
    if (promptResponse.error) {
      throw new Error(promptResponse.content);
    }

    // This is a bit hacky but it does ensure that the TextStreamContainer is updated.
    setAiManager(aiManager);
    updateHistory();
  }

  const context = `${_pluginSetting.event?.title || _pluginSetting.event?.type || 'Loading...'}`;
  return openPopup ? (
    <div ref={rootRef}>
      <Drawer
        open={openPopup}
        anchor={'right'}
        transitionDuration={{ enter: 2000, exit: 2000 }}
        BackdropProps={{ invisible: true }}
        variant="persistent"
        PaperProps={{
          style: {
            width: '25%',
            maxWidth: '50%',
            height: '95vh',
            top: '60px',
          },
        }}
      >
        <Box
          sx={{
            padding: 1,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h6">
              AI Assistant (beta)
            </Typography>
          </Box>
          <Box>
            <ActionButton
              description="Close"
              onClick={() => {
                setOpenPopup(false);
              }}
              icon="mdi:chevron-right-box-outline"
            />
          </Box>
        </Box>
        <Grid
          container
          direction="column"
          justifyContent="flex-end"
          alignItems="stretch"
          sx={{
            height: '100%',
            padding: 1,
          }}
        >
          <Grid
            item
            xs
            sx={{
              height: '100%',
              overflowY: 'auto',
            }}
          >
            <TextStreamContainer
              history={promptHistory}
              isLoading={loading}
              apiError={apiError}
            />
          </Grid>
          <Grid
            item
            sx={{
              paddingY: 1,
            }}
          >
            {!loading &&
              <Box>
                {suggestions.map(prompt => {
                  return (
                    <Box m={1}>
                      <Chip
                        label={prompt}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setPromptVal(prompt);
                        }}
                        onDelete={() => {
                          AnalyzeResourceBasedOnPrompt(prompt).catch((error) => {
                            console.log(error)
                            setApiError(error.message);
                          });
                        }}
                        deleteIcon={<Icon icon="mdi:send" width="20px" />}
                      />
                    </Box>
                  );
                })}
              </Box>
            }
            <Paper
              component="form"
              elevation={0}
            >
              <TextField
                id="deployment-ai-prompt"
                onChange={event => {
                  setPromptVal(event.target.value);
                }}
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const prompt = promptVal;
                    setPromptVal('');

                    AnalyzeResourceBasedOnPrompt(prompt).catch((error) => {
                      console.log(error)
                      setApiError(error.message);
                    });
                  }
                }}
                variant="outlined"
                value={promptVal}
                label="Ask AI"
                fullWidth
                multiline
                error={promptError}
                helperText={promptError ? 'Please select from one of the provided prompts above' : ''}
              />
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item>
                  <ActionButton
                    description="Clear History"
                    onClick={() => {
                      aiManager.reset();
                      updateHistory();
                    }}
                    icon="mdi:broom"
                  />
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    endIcon={<Icon icon="mdi:send" width="20px" />}
                    onClick={() => {
                      updateHistory();
                      setPromptVal('');
                      const prompt = promptVal;
                      AnalyzeResourceBasedOnPrompt(prompt).catch((error) => {
                        console.log(error)
                        setApiError(error.message);
                      });
                    }}
                    size="small"
                    disabled={loading || !promptVal}
                  >
                    Send
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Drawer>
    </div>
  ) : null;
}
