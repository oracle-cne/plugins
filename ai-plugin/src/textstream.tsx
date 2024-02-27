import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, Typography } from '@mui/material';
import * as yaml from 'js-yaml';
import ReactMarkdown from 'react-markdown';
import { apply } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { ActionButton, Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { EditorDialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { Prompt } from './ai/manager';

interface TextStreamContainerProps {
  history: Prompt[];
  isLoading: boolean;
  apiError: string;
}

const TextStreamContainer = (props: TextStreamContainerProps) => {
  const { history, isLoading, apiError } = props;
  const [historyLength, setHistoryLength] = useState(0);
  const lastMessageRef = React.useRef<null | HTMLDivElement>(null);

  const messagesToDisplay = React.useMemo(() => {
    return history.filter(m => m.role !== 'context');
  },
  [history])

  React.useEffect(() => {
    if (isLoading) {
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }
    if (history.length > 0 && history.length !== historyLength) {
      // We only scroll if the last message is not the context, because the
      // context may not be added as the direct result of a user action.
      if (history[history.length - 1].role !== 'context') {
        lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      setHistoryLength(history.length);
    }
  },
  [history, isLoading])

  return (
    <Box
      sx={{
        overflow: 'auto',
        height: '100%',
      }}
    >
      {messagesToDisplay.map(({ content, role }, idx) => (
        <>
          <Box sx={{
              borderRadius: "10px",
              padding: "10px",
              margin: "10px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              wordBreak: 'break-word',
              marginRight: role === 'user' ? undefined : 4,
              marginLeft: role !== 'user' ? undefined : 4,
            }}
            ref={(idx === messagesToDisplay.length - 1 && !isLoading) ? lastMessageRef : undefined}
            key={`message-${idx}`}
          >
            <Typography variant="body2" color="textPrimary" sx={{ fontWeight: 'bold' }}>{role === 'user' ? 'You' : 'AI Assistant'}</Typography>
            <TextStream incomingText={content} />
          </Box>
          <Divider />
        </>
      ))}
      {apiError && <Alert severity="error">{apiError}</Alert>}
      {isLoading && (
        <Box>
          <Loader title=""/>
          {/* This is a hack to scroll to the bottom of the chat when the loader is shown */}
          <Box  ref={lastMessageRef} />
        </Box>
      )}
    </Box>
  );
};

const TextStream = (props) => {
  const { incomingText } = props;
  const { enqueueSnackbar } = useSnackbar();
  const [showEditor, setShowEditor] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  function MultilineCodeRenderer(props: {code: string}) {
    const { code } = props;

    const isSingleObject = React.useMemo(() => {
      try {
        const parsed = yaml.loadAll(code);
        return parsed.length === 1;
      } catch (error) {
        try {
          console.debug('AIPlugin: Error parsing YAML code:', error.message)
          const parsed = JSON.parse(code);
          return typeof parsed === 'object';
        } catch (error) {
          console.debug('AIPlugin: Error parsing JSON code:', error.message)
        }
      }

      return false;
    },
    [])

    return (
      <Box
        sx={{
          // Make copy button visible
          position: 'relative',
          '& .code-tools': {
            visibility: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
            marginTop: '-30px',
          },
          '&:hover': {
            '& .code-tools': {
              visibility: 'visible',
            },
          },
          '& pre': {
            textWrap: 'wrap',
          },
        }}
      >
        <Box
          className="code-tools"
          sx={(theme) => ({
            background: theme.palette.background.paper,
          })}
        >
          <ActionButton
            description={'Copy'}
            onClick={() => {
              navigator.clipboard.writeText(code);
            }}
            icon={'mdi:content-copy'}
            iconButtonProps={{
              size: 'small'
            }}
          />
          {
          // We only allow to open the editor when it's a single object due to
          // a limitation in the Headlamp EditorDialog.
          isSingleObject &&
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                setItemToEdit(yaml.loadAll(code)[0]);
                setShowEditor(true);
              }}
            >
              Open in Editor
            </Button>
          }
        </Box>
        <pre>
          <code>
            {code}
          </code>
        </pre>
      </Box>
    );
  }

  const renderers = {
    code: (codeInfo) => {
      const code = codeInfo.children.join('');
      // Check if multiline
      if (!code.includes('\n')) {
        return (
          <code>{code}</code>
        );
      }

      return (
        <MultilineCodeRenderer code={code} />
      );
    }
  }

  return (
    <Box
      className={`text-stream-message`}
    >
      <ReactMarkdown
        components={renderers}
      >
        {incomingText}
      </ReactMarkdown>
      <EditorDialog
        item={itemToEdit}
        open={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={async (items) => {
          enqueueSnackbar(`Applying resources`, { variant: 'info' });
          setShowEditor(false);

          const errors: {kind: string; name: string; error: string}[] = []
          for (const item of items) {
            try {
              await apply(item);
            } catch (error) {
              console.error('Error applying resource:', error);
              errors.push({kind: item.kind, name: item.metadata.name ?? '', error: error.message});
            }
          }

          if (errors.length > 0) {
            enqueueSnackbar(`Error applying resources: ${errors.map(e => `${e.kind}${e.name}: ${e.error}`).join(', ')}`, { variant: 'error' });
            setShowEditor(true);
          } else {
            enqueueSnackbar(`Resources applied successfully`, { variant: 'success' });
          }
        }}
      />
    </Box>
  );
};

export default TextStreamContainer;
