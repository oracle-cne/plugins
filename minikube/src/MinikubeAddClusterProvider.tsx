import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { Card, CardContent, CardHeader, Button, Typography } from '@mui/material';
import MinikubeIcon from './minikube.svg';

export default function MinikubeAddClusterProvider() {
  const { t } = useTranslation();
  const history = useHistory();
  return (
    <Card variant="outlined">
      <CardHeader title="Minikube" avatar={<MinikubeIcon width={24} height={24} />} />
      <CardContent>
        <Typography>
          {t(
            'Minikube is a lightweight tool that simplifies the process of setting up a Kubernetes environment on your local PC. It provides a localStorage, single-node Kubernetes cluster that you can use for learning, development, and testing purposes.'
          )}
        </Typography>
        <Button
          variant="contained"
          onClick={() => history.push('/create-cluster-minikube')}
          sx={{ mt: 2 }}
        >
          {t('Add')}
        </Button>
      </CardContent>
    </Card>
  );
}
