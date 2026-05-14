export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="t-label mb-6">{"// "}iot-bee</div>
        {children}
      </div>
    </main>
  );
}
