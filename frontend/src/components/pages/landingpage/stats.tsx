const stats = [
  {
    value: "400ms",
    label: "Average settlement time",
  },
  {
    value: "$0.00025",
    label: "Average transaction fee",
  },
  {
    value: "65,000+",
    label: "Transactions per second",
  },
  {
    value: "99.9%",
    label: "Network uptime",
  },
]

export default function Stats() {
  return (
    <section className="px-4 py-20 sm:py-32 border-y border-border">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="mb-2 text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent sm:text-4xl">
                {stat.value}
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
