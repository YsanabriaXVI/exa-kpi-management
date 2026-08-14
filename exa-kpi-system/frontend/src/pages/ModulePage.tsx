type ModulePageProps = {
  title: string;
  moduleName?: string;
};

export function ModulePage({ title, moduleName }: ModulePageProps) {
  return (
    <main className="module-page">
      <p className="module-eyebrow">{moduleName ?? "Module"}</p>
      <h1>{title}</h1>
    </main>
  );
}
