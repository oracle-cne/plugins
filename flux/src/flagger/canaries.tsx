import React from 'react';
import { Box } from '@mui/material';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { Table, SectionBox, Loader, Link } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Icon } from '@iconify/react';
import CanaryStatus from './canarystatus';
import { DeploymentProgress } from './deploymentprogress';
import FlaggerAvailabilityCheck from './availabilitycheck';

export default function Canaries() {
    const [canary, error] = K8s.ResourceClasses.CustomResourceDefinition.useGet('canaries.flagger.app');
    const canaryResourceClass = React.useMemo(() => {
        return canary?.makeCRClass();
    }, [canary]);

    return (
      <FlaggerAvailabilityCheck>
       {canaryResourceClass ? <CanaryList canaryResourceClass={canaryResourceClass} /> : <Loader />}
      </FlaggerAvailabilityCheck>
    );
}

function CanaryList({ canaryResourceClass }) {
    const [canaries] = canaryResourceClass.useList();
    const [deployments] = K8s.ResourceClasses.Deployment.useList();
    
    // Calculate pod counts for canary and primary deployments
    const canariesWithPodCounts = React.useMemo(() => {
        if (!canaries || !deployments) return null;
        return canaries.map(canary => {
            const targetName = canary?.jsonData?.spec?.targetRef?.name;
            const namespace = canary?.jsonData?.metadata?.namespace;
            
            // Find the original canary deployment
            const canaryDeployment = deployments.find(
                d => d.jsonData.metadata.name === targetName && d.jsonData.metadata.namespace === namespace
            );
            // Find the primary deployment (with -primary suffix)
            const primaryDeployment = deployments.find(
                d => d.jsonData.metadata.name === `${targetName}-primary` && d.jsonData.metadata.namespace === namespace
            );
            
            const abTesting = canary?.jsonData?.spec?.analysis?.match || [];
            
            // Check if A/B testing is enabled
            const hasAbTesting = abTesting.length > 0;
            
            // Format A/B testing headers or cookies
            const abHeaders = abTesting
                .filter(match => match.headers)
                .map(match => Object.keys(match.headers)[0])
                .join(', ');
                
            const abCookies = abTesting
                .filter(match => match.cookies)
                .map(match => Object.keys(match.cookies)[0])
                .join(', ');


            return {
                ...canary.jsonData,
                canaryPodCount: canaryDeployment?.status?.readyReplicas || 0,
                primaryPodCount: primaryDeployment?.status?.readyReplicas || 0,
                hasAbTesting,
                abHeaders,
                abCookies
            };
        });
    }, [canaries, deployments]);
    console.log("canariesWithPodCounts are ",canariesWithPodCounts);
    return (
        <SectionBox title="Canaries">
            <Table
               data={canariesWithPodCounts}
                columns={[
                    {
                        header: 'Name',
                        accessorKey: 'metadata.name',
                        Cell: ({ row: { original: item } }) => {
                            return (<Link routeName={`/flux/flagger/canaries/:namespace/:name`} params={{
                                name: item.metadata.name,
                                namespace: item.metadata.namespace,
                            }}>
                                <Box alignItems="center" display="flex"><Box mr={0.5}>{item.metadata.name}</Box>
                                <Icon icon="mdi:bird" color="#fff200" width={"20"}/></Box>
                            </Link>)
                        },
                    },
                    {
                      header: 'Status',
                      accessorKey: 'status.phase',
                      Cell: ({ row: { original: item } }) => {
                        // Correctly extract the phase from the status object
                        const phase = item?.status?.phase || 'Unknown';
                        return <CanaryStatus status={phase} />;
                      },
                    },
                    {
                        header: 'Namespace',
                        accessorKey: 'metadata.namespace',
                        Cell: ({ row: { original: item } }) => (
                            <Link routeName={'namespace'} params={{ name: item.metadata.namespace }}>
                                {item.metadata.namespace}
                            </Link>
                        ),
                    },
                    {
                        header: 'Target',
                        accessorKey: 'spec.targetRef.name',
                        Cell: ({ row: { original: item } }) => {
                            console.log(item);
                            const kind = item?.spec?.targetRef?.kind;
                            const namespace = item?.spec?.targetRef?.namespace || item?.metadata?.namespace;
                            const name = item?.spec?.targetRef?.name;
                            console.log("kind is ",kind);
                            console.log("namespace is ",namespace);
                            console.log("name is ",name);
                          //@ts-ignore
                           const resource = item.jsonData;
                           console.log("resource is ",resource);
                          return (
                            <Link routeName={`${kind.toLowerCase()}s`} params={{ name, namespace }}>
                                {name}
                            </Link>
                          )
                        }},
                    {
                      header: 'Progress',
                      Cell: ({ row: { original: item } }) => (
                        <DeploymentProgress canary={item} />
                      )
                    },
                    {
                      header: 'Canary Pods',
                      Cell: ({ row: { original: item } }) => (
                        item.canaryPodCount || 0
                      )
                    },
                    {
                      header: 'Primary Pods',
                      Cell: ({ row: { original: item } }) => (
                        item.primaryPodCount || 0
                      )
                    },
                    {
                      header: 'A/B Testing',
                      Cell: ({ row: { original: item } }) => (
                        item.hasAbTesting ? (
                          <Box display="flex" alignItems="center">
                            <Icon icon="mdi:check" color="#4caf50" width="20" />
                          </Box>
                        ) : (
                          <Box display="flex" alignItems="center">
                            <Icon icon="mdi:close" color="#f44336" width="20" />
                          </Box>
                        )
                      )
                    },
                    {
                      header: 'A/B Headers',
                      Cell: ({ row: { original: item } }) => (
                        item.abHeaders || '-'
                      ),
                    },
                    {
                      header: 'A/B Cookies',
                      Cell: ({ row: { original: item } }) => (
                        item.abCookies || '-'
                      ),
                    },
                    {
                      header: 'MaxWeight',
                      accessorKey: 'spec.analysis.maxWeight',
                      Cell: ({row: {original: item}}) => (
                        item.spec.analysis.maxWeight
                      )
                    },
                    {
                      header: 'StepWeight',
                      accessorKey: 'spec.analysis.stepWeight',
                      Cell: ({row: {original: item}}) => (
                        item.spec.analysis.stepWeight
                      )
                    }, {
                      header: 'Threshold',
                      accessorKey: 'spec.analysis.threshold',
                      Cell: ({row: {original: item}}) => (
                        item.spec.analysis.threshold
                      )
                    },
                    {
                      header: 'Interval',
                      accessorKey: 'spec.analysis.interval',
                      Cell: ({row: {original: item}}) => (
                        item.spec.analysis.interval
                      )
                    }
                ]}
            />
        </SectionBox>
    );
}
