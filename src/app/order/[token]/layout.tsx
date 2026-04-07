export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-cafe-background text-cafe-foreground">
      {children}
    </div>
  );
}
