import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-b from-gray-50 via-white to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 right-[-10rem] h-72 w-[42rem] rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-6xl items-center px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="text-center lg:text-left">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur lg:mx-0">
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" />
              Verified talent. Clear outcomes. Fast hiring.
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Build and hire on <span className="text-blue-600">SkillSphere</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl">
              A modern freelance marketplace connecting top talent with ambitious clients. Post a project, match with the
              right expert, and move from idea to delivery—without the chaos.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 active:translate-y-px"
              >
                Join as Freelancer
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-blue-100 active:translate-y-px"
              >
                Hire Talent
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 rounded-2xl border border-gray-200 bg-white/70 p-4 text-center shadow-sm backdrop-blur sm:p-5 lg:max-w-xl">
              <div>
                <div className="text-xl font-bold text-gray-900 sm:text-2xl">10k+</div>
                <div className="mt-1 text-xs font-medium text-gray-600 sm:text-sm">Freelancers</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 sm:text-2xl">48h</div>
                <div className="mt-1 text-xs font-medium text-gray-600 sm:text-sm">Avg. match time</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 sm:text-2xl">4.9/5</div>
                <div className="mt-1 text-xs font-medium text-gray-600 sm:text-sm">Client rating</div>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Recommended matches</p>
                  <p className="mt-1 text-sm text-gray-600">A quick preview of what SkillSphere feels like.</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                  Live
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  { name: 'UI/UX Designer', tag: 'Figma • Mobile-first', price: '$35/hr', badge: 'Top Rated' },
                  { name: 'MERN Stack Developer', tag: 'React • Node • MongoDB', price: '$45/hr', badge: 'Fast Reply' },
                  { name: 'WordPress Specialist', tag: 'Elementor • SEO-ready', price: '$28/hr', badge: 'Verified' },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                        <span className="hidden rounded-full bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 sm:inline">
                          {item.badge}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-600">{item.tag}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">{item.price}</p>
                      <p className="mt-1 text-xs text-gray-600">Starting</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { title: 'Post a job', desc: 'Describe your project in minutes' },
                  { title: 'Match fast', desc: 'Shortlist experts confidently' },
                  { title: 'Pay securely', desc: 'Milestones and protected payments' },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500 lg:text-left">
              No commitment required. Explore as a client or freelancer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}