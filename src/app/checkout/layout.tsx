// Checkout layout — overlays root layout (navbar/footer hidden visually)
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto">
      {children}
    </div>
  )
}
