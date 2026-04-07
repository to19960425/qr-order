export function InvalidTokenView() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">QRコードを読み取れませんでした</h1>
      <p className="mt-4 text-base">
        QRコードが正しく読み取れませんでした。
        <br />
        お手数ですがスタッフにお声がけください。
      </p>
    </div>
  );
}
