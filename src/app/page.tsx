export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cafe-background text-cafe-foreground">
      <main className="flex flex-col items-center gap-6 px-4 text-center">
        <h1 className="text-3xl font-bold">QRコードで注文</h1>
        <p className="text-lg">
          テーブルに設置されたQRコードを
          <br />
          読み取って注文してください
        </p>
      </main>
    </div>
  );
}
