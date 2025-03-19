import { MenuItem, ListItemText } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  registerRoute,
  registerSidebarEntry,
  registerClusterProviderDialog,
  helpers,
  registerAddClusterProvider,
  registerClusterProviderMenuItem,
} from '@kinvolk/headlamp-plugin/lib';
import CreateClusterPage from './CreateClusterPage';
import CommandCluster from './CommandCluster/CommandCluster';
import MinikubeAddClusterProvider from './MinikubeAddClusterProvider';

registerSidebarEntry({
  parent: null,
  name: 'minikube',
  label: 'Minikube',
  url: '/create-cluster-minikube',
  icon: 'mdi:comment-quote',
  sidebar: 'HOME',
  useClusterURL: false,
});

registerRoute({
  path: '/create-cluster-minikube',
  sidebar: 'minikube',
  name: 'minikube',
  component: () => <CreateClusterPage />,
  exact: true,
  useClusterURL: false,
  noAuthRequired: true,
});

/**
 * @returns true if the cluster is a minikube cluster
 */
function isMinikube(cluster) {
  return cluster.meta_data?.extensions?.context_info?.provider === 'minikube.sigs.k8s.io';
}

registerClusterProviderMenuItem(({ cluster, setOpenConfirmDialog, handleMenuClose }) => {
  const { t } = useTranslation();
  if (!helpers.isElectron() || !isMinikube(cluster)) {
    return null;
  }

  return (
    <MenuItem
      onClick={() => {
        setOpenConfirmDialog('deleteMinikube');
        handleMenuClose();
      }}
    >
      <ListItemText>{t('Delete')}</ListItemText>
    </MenuItem>
  );
});

registerClusterProviderMenuItem(({ cluster, setOpenConfirmDialog, handleMenuClose }) => {
  const { t } = useTranslation();
  if (!helpers.isElectron() || !isMinikube(cluster)) {
    return null;
  }

  return (
    <MenuItem
      onClick={() => {
        setOpenConfirmDialog('startMinikube');
        handleMenuClose();
      }}
    >
      <ListItemText>{t('Start')}</ListItemText>
    </MenuItem>
  );
});

registerClusterProviderMenuItem(({ cluster, setOpenConfirmDialog, handleMenuClose }) => {
  const { t } = useTranslation();
  if (!helpers.isElectron() || !isMinikube(cluster)) {
    return null;
  }

  return (
    <MenuItem
      onClick={() => {
        setOpenConfirmDialog('stopMinikube');
        handleMenuClose();
      }}
    >
      <ListItemText>{t('Stop')}</ListItemText>
    </MenuItem>
  );
});

registerClusterProviderDialog(({ cluster, openConfirmDialog, setOpenConfirmDialog }) => {
  if (!helpers.isElectron() || !isMinikube(cluster)) {
    return null;
  }

  return (
    <CommandCluster
      initialClusterName={cluster.name}
      open={openConfirmDialog === 'startMinikube'}
      handleClose={() => setOpenConfirmDialog('')}
      onConfirm={() => {
        setOpenConfirmDialog('');
      }}
      command={'start'}
      finishedText={'Done! kubectl is now configured'}
    />
  );
});

registerClusterProviderDialog(({ cluster, openConfirmDialog, setOpenConfirmDialog }) => {
  if (!helpers.isElectron() || !isMinikube(cluster)) {
    return null;
  }

  return (
    <CommandCluster
      initialClusterName={cluster.name}
      open={openConfirmDialog === 'stopMinikube'}
      handleClose={() => setOpenConfirmDialog('')}
      onConfirm={() => {
        setOpenConfirmDialog('');
      }}
      command={'stop'}
      finishedText={'node stopped.'}
    />
  );
});

registerClusterProviderDialog(({ cluster, openConfirmDialog, setOpenConfirmDialog }) => {
  if (!helpers.isElectron() || !isMinikube(cluster)) {
    return null;
  }

  return (
    <CommandCluster
      initialClusterName={cluster.name}
      open={openConfirmDialog === 'deleteMinikube'}
      handleClose={() => setOpenConfirmDialog('')}
      onConfirm={() => {
        setOpenConfirmDialog('');
      }}
      command={'delete'}
      finishedText={'Removed all traces of the'}
    />
  );
});

// For the add cluster page, add a section for minikube
registerAddClusterProvider(MinikubeAddClusterProvider);
