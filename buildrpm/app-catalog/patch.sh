patch -p0 < buildrpm/app-catalog/charts.EditorDialog.tsx.patch
patch -p0 < buildrpm/app-catalog/charts.tsx.patch
patch -p0 < buildrpm/app-catalog/Details.tsx.patch
patch -p0 < buildrpm/app-catalog/index.tsx.patch
patch -p0 < buildrpm/app-catalog/List.tsx.patch
patch -p0 < buildrpm/app-catalog/releases.EditorDialog.tsx.patch

cp buildrpm/app-catalog/catalog.ts app-catalog/src/helpers/
cp buildrpm/app-catalog/catalogs.tsx app-catalog/src/api/
