type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="border-b bg-muted/35">
      <div className="container py-12 md:py-16">
        <p className="text-sm font-semibold uppercase tracking-normal text-accent">
          {eyebrow}
        </p>
        <h1 className="text-balance mt-3 max-w-4xl text-4xl font-semibold sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}
