

%if 0%{?with_debug}
%global _dwz_low_mem_die_limit 0
%else
%global debug_package   %{nil}
%endif

%{!?registry: %global registry container-registry.oracle.com/olcne}
%global app_name               ui-plugins
%global app_version            2.1.0
%global oracle_release_version 1
%global _buildhost             build-ol%{?oraclelinux}-%{?_arch}.oracle.com
%global plugin_dir              headlamp-plugins

Name:           %{app_name}-container-image
Version:        %{app_version}
Release:        %{oracle_release_version}%{?dist}
Summary:        Plugins for the Headlamp UI
License:        Apache-2.0
Group:          System/Management
Url:            https://github.com/oracle-cne/plugins
Source:         %{name}-%{version}.tar.bz2


%description
Plugins for the Oracle Cloud Native Environment UI.

%prep
%setup -q -n %{name}-%{version}

%build
%global docker_tag %{registry}/%{app_name}:v%{version}
chmod +x ./olm/build-plugins-container-image.sh
./oracle/build-istio-container-images.sh --app-name %{app_name} --docker-tag %{docker_tag}

%install
%__install -D -m 644 %{app_name}.tar %{buildroot}/usr/local/share/olcne/%{app_name}.tar

%files
%license LICENSE THIRD_PARTY_LICENSES.txt olm/SECURITY.md
/usr/local/share/olcne/%{app_name}.tar

%changelog
* Tue May 13 2025 Murali Annamneni <murali.annamneni@oracle.com> - 2.1.0-1
- Reorganise code to add build aggregator branch to pull and build selective plugins

* Sat Apr 05 2025 Daniel Krasinski <daniel.krasinski@oracle.com> - 2.0.0-3
- Rebuild with latest Oracle Linux 8 base image

* Mon Sep 09 2024 Daniel Krasinski <daniel.krasinski@oracle.com> - 2.0.0-2
- Change plugin install directory to match the expectation of the UI container image

* Sat Aug 31 2024 Daniel Krasinski <daniel.krasinski@oracle.com> - 2.0.0-1
- Oracle Cloud Native Environment UI plugins
