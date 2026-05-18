import { useEffect } from 'react';

export function GrowthRoomPrivacy() {
  useEffect(() => {
    document.title = 'Growth Room Privacy Policy — Neil Minty';
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="max-w-2xl pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Legal</p>
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Growth Room Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-2">Updated: 18 May 2026</p>
        <p className="text-sm text-slate-500">Operated by Growth Room, Neil Minty trading as Personaify.</p>
        <p className="text-sm text-slate-500">
          Contact:{' '}
          <a href="mailto:neil@personaify.io" className="text-slate-700 hover:text-slate-900 underline underline-offset-2">
            neil@personaify.io
          </a>
        </p>

        <div className="mt-10 space-y-10">

          {/* 1 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">1. Who we are</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Growth Room is a commercial intelligence platform for direct-to-consumer brands, operated by Personaify Ltd (we, us, our), a sole trader registered for business in England and Wales. Questions about this policy can be directed to{' '}
              <a href="mailto:neil@personaify.io" className="text-slate-700 hover:text-slate-900 underline underline-offset-2">neil@personaify.io</a>.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              The platform provides data analytics, AI-assisted insight, and reporting services to merchant clients (Clients) who connect their ecommerce, marketing, and advertising data sources to the platform.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">2. Our role: controller and processor</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              Growth Room occupies two legally distinct roles and this distinction is load-bearing under UK GDPR:
            </p>
            <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-slate-400 mt-1 shrink-0">•</span>
                <span><strong className="font-medium text-slate-900">Data controller</strong> in respect of platform user data (the individuals who log in to Growth Room on behalf of a Client organisation). We determine the purpose and means of processing that data.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400 mt-1 shrink-0">•</span>
                <span><strong className="font-medium text-slate-900">Data processor</strong> in respect of end-customer data belonging to our Clients. The Client (the merchant) is the data controller. We process that data solely on the Client's instructions and for the purpose of providing the platform service.</span>
              </li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              This policy addresses both roles separately in the sections below.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">3. Data we collect and process</h2>

            <h3 className="text-sm font-semibold text-slate-700 mb-2">3.1 Platform user data (Growth Room as controller)</h3>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              When an individual registers for or accesses Growth Room on behalf of a Client organisation, we collect and process:
            </p>
            <ul className="space-y-1.5 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Name and email address (via Supabase Auth)</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Hashed password and session tokens</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Organisation membership record (org_users table: user ID, org ID, role)</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Invite tokens where applicable (email address, assigned role, 7-day expiry, accepted_at timestamp)</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Login timestamps and in-platform activity logs</span></li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-700 mt-6 mb-2">3.2 End-customer data (Growth Room as processor)</h3>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              Where a Client connects a Shopify store to the platform, Growth Room ingests and processes:
            </p>
            <ul className="space-y-1.5 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-slate-400 mt-1 shrink-0">•</span>
                <span><span className="font-mono text-sm bg-slate-100 px-1 rounded">shopify_customer_id</span> — a pseudonymous identifier used as the identity spine across all agent processing. This is not stored alongside, and cannot be reverse-mapped to, any directly identifying information within the Growth Room platform.</span>
              </li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Order history, order values, product types, fulfilment dates — used to compute cohort metrics, LTV bands, and repeat purchase rates.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Aggregated or pseudonymised behavioural signals derived from the above.</span></li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              <strong className="font-medium text-slate-900">What we do not store:</strong> names, email addresses, phone numbers, shipping addresses, or any other directly identifying end-customer data. The absence of these fields is deliberate and constitutes part of our privacy-by-design architecture.
            </p>
            <div className="mt-4 pl-4 border-l-2 border-slate-200">
              <p className="text-sm text-slate-500 leading-relaxed">
                Note: Where a Client connects Klaviyo, the platform may sync <span className="font-mono bg-slate-100 px-1 rounded">shopify_customer_id</span> alongside profile properties to Klaviyo for email segmentation. This transmission is gated by the Client's DPA configuration flag (see Section 7).
              </p>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">4. AI and LLM processing</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-4">
              Three specific integration points route data to external AI APIs. Each is disclosed separately.
            </p>

            <h3 className="text-sm font-semibold text-slate-700 mb-2">4.1 Anthropic (Claude API)</h3>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              Product copy excerpts and GEO gap analysis data are sent to the Anthropic Claude API (model: claude-sonnet-4-20250514) to generate content brief differentiation sections. This data is brand-identifiable but does not include end-customer personal data.
            </p>
            <p className="text-base text-slate-700 leading-relaxed">
              Anthropic's API data handling terms confirm: (a) API inputs are not used to train Anthropic's models; (b) API request logs are retained for 7 days before deletion. Growth Room's use of the Claude API is governed by Anthropic's commercial terms, not the consumer privacy policy.
            </p>

            <h3 className="text-sm font-semibold text-slate-700 mt-6 mb-2">4.2 Perplexity</h3>
            <p className="text-base text-slate-700 leading-relaxed">
              AEO cluster query strings are sent to the Perplexity API for citation share polling. These queries are brand-identifiable (e.g. product category queries associated with the Client's market) but contain no personal data.
            </p>

            <h3 className="text-sm font-semibold text-slate-700 mt-6 mb-2">4.3 On-platform inference</h3>
            <p className="text-base text-slate-700 leading-relaxed">
              Agent summary generation and insight synthesis performed within the platform uses API calls subject to the same terms as 4.1. No end-customer personal data is included in these prompts.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">5. Sub-processors</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-4">
              Growth Room uses the following sub-processors. All are bound by data processing agreements or equivalent contractual protections. This list reflects current integrations and will be updated when material changes are made.
            </p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-widest">Sub-processor</th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-widest">Data sent</th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-widest hidden md:table-cell">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Supabase', 'All org and platform user data; auth credentials', 'Database infrastructure and authentication'],
                    ['Anthropic (Claude)', 'Product copy excerpts; GEO analysis content', 'Content brief generation (generate-content-briefs edge function)'],
                    ['Perplexity', 'AEO cluster query strings (no PII)', 'Citation share polling (poll-citation-share edge function)'],
                    ['Firecrawl', 'Competitor URLs supplied by Client', 'Benchmark page crawling (crawl-competitor-pages edge function)'],
                    ['Meta / Facebook', 'Customer identifiers within approved audience segments (DPA flag required)', 'Campaign audience targeting (gated by dpa_processors[] org config)'],
                    ['Klaviyo', 'shopify_customer_id + profile properties (DPA flag required)', 'Email segmentation sync (gated by dpa_processors[] org config)'],
                    ['Google', 'Search query data; analytics and ad performance data', 'Paid and organic intelligence (GSC, Google Ads, GMC, GA4)'],
                    ['Hotjar', 'Session and interaction data from platform users (org admins and viewers)', 'Dashboard behaviour analytics for CRO agent development'],
                    ['GitHub Actions', 'No customer data — CI/CD pipeline only', 'Platform deployment'],
                    ['Vercel', 'Edge function requests; no persistent customer data', 'Compute and edge function hosting'],
                  ].map(([processor, data, purpose]) => (
                    <tr key={processor}>
                      <td className="py-3 px-4 font-medium text-slate-900 align-top whitespace-nowrap">{processor}</td>
                      <td className="py-3 px-4 text-slate-600 align-top">{data}</td>
                      <td className="py-3 px-4 text-slate-500 align-top hidden md:table-cell">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pl-4 border-l-2 border-slate-200">
              <p className="text-sm text-slate-500 leading-relaxed">
                Campaign execution sub-processors (Meta, Klaviyo): Functions that transmit customer segment data to Meta or Klaviyo are gated by a per-org configuration flag (<span className="font-mono bg-slate-100 px-1 rounded">dpa_processors[]</span> on the org config record). These functions will not execute for a Client org unless that Client has confirmed those platforms are listed in their own Data Processing Agreement and the flag has been explicitly enabled. The enabling mechanism is the org config flag, not the presence of API credentials.
              </p>
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">6. Legal basis for processing</h2>

            <h3 className="text-sm font-semibold text-slate-700 mb-2">6.1 Platform user data (Growth Room as controller)</h3>
            <ul className="space-y-1.5 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Contract:</strong> processing necessary to perform the Growth Room service agreement with the Client</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Legitimate interests:</strong> platform security, session integrity, abuse prevention, and product improvement, where these interests are not overridden by individual rights</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Consent:</strong> where we send optional product communications (withdrawable at any time)</span></li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-700 mt-6 mb-2">6.2 End-customer data (Growth Room as processor)</h3>
            <p className="text-base text-slate-700 leading-relaxed">
              The legal basis for processing end-customer data is determined by each Client as data controller. Clients are responsible for ensuring they have a lawful basis for instructing Growth Room to process their customers' data.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">7. International data transfers</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              Several sub-processors are headquartered in the United States. Growth Room relies on the following mechanisms for UK GDPR-compliant transfers to these processors:
            </p>
            <ul className="space-y-1.5 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Supabase:</strong> data stored in EU region infrastructure. No UK-to-US transfer for stored data.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Anthropic:</strong> governed by Anthropic's commercial Data Processing Addendum, which incorporates Standard Contractual Clauses (SCCs) as the transfer mechanism.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Perplexity:</strong> API requests processed in the US. Transfer reliant on SCCs under Perplexity's API terms.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Firecrawl:</strong> URL-only crawl requests. Transfer reliant on SCCs.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Meta, Google, Klaviyo:</strong> each maintains SCCs or equivalent UK adequacy mechanisms under their own DPA frameworks.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Hotjar:</strong> EU data centre option available and used. Hotjar maintains SCCs for any residual US processing.</span></li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Clients connecting EU-based data sources are advised to review the applicable transfer mechanisms for each sub-processor listed above.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">8. Data retention</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">Retention periods by data category:</p>
            <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Platform user accounts (email, role, org membership): retained for the duration of the Client relationship and for 12 months following org deactivation, after which records are deleted or anonymised. Invite tokens expire after 7 days and accepted tokens are cleared at org offboarding.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>End-customer order and cohort data (ingested from Shopify): retained for the duration of the active Client relationship. On termination, data is deleted or anonymised within 30 days unless the Client requests a prior export.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><span className="font-mono text-sm bg-slate-100 px-1 rounded">agent_daily_summaries</span>, <span className="font-mono text-sm bg-slate-100 px-1 rounded">citation_snapshots</span>, <span className="font-mono text-sm bg-slate-100 px-1 rounded">inventory_sku_snapshots</span>, <span className="font-mono text-sm bg-slate-100 px-1 rounded">creator_attributions</span>, <span className="font-mono text-sm bg-slate-100 px-1 rounded">competitor_geo_scores</span>: rows accumulate per org. Defined automated retention windows are in development. Clients will be notified when implemented.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><span className="font-mono text-sm bg-slate-100 px-1 rounded">schema_audit_cache</span>: 72-hour TTL applied at the edge function level.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Audit and security logs: up to 12 months.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Aggregated, anonymised analytics (no personal data): indefinite.</span></li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Clients may request deletion of their organisation's data at any time by contacting{' '}
              <a href="mailto:neil@personaify.io" className="text-slate-700 hover:text-slate-900 underline underline-offset-2">neil@personaify.io</a>. Verified requests will be actioned within 30 days.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">9. Security measures</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              Growth Room implements the following technical and organisational controls:
            </p>
            <ul className="space-y-1.5 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>All data stored in Supabase with row-level security (RLS) policies enforced at the database layer, isolating each Client org's data from other orgs</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Encryption in transit (TLS 1.2+) and at rest</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>API credentials stored in Supabase Vault (encrypted secret store), not in application tables</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Access controls limiting direct database access to authorised personnel only</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Pseudonymisation of end-customer identifiers (<span className="font-mono text-sm bg-slate-100 px-1 rounded">shopify_customer_id</span> used in place of directly identifying data)</span></li>
            </ul>
            <div className="mt-4 pl-4 border-l-2 border-slate-200">
              <p className="text-sm text-slate-500 leading-relaxed">
                Note: A known limitation: the <span className="font-mono bg-slate-100 px-1 rounded">agent_daily_summaries</span> table currently operates under a broader read policy that is not fully scoped to org_id at the RLS level. A migration to enforce org-level isolation on this table is planned as a platform priority (Phase 7). Until that migration is deployed, Growth Room does not represent that this specific table is subject to the same isolation guarantees as other data stores. Clients will be notified when that migration is complete.
              </p>
            </div>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">10. Session recording (Hotjar)</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Growth Room uses Hotjar to record user interactions on the platform dashboard for the purpose of improving the product experience (CRO agent development). Session recordings capture the behaviour of platform users (org admins and viewers) and may constitute personal data under UK GDPR.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Hotjar session data is subject to Hotjar's own GDPR-compliant data processing terms. Platform users may opt out of session recording via Hotjar's opt-out mechanism (available at hotjar.com/policies/do-not-track). Session recordings do not capture end-customer data.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">11. Your rights</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              Individuals whose data Growth Room processes as controller (platform users) have the following rights under UK GDPR:
            </p>
            <ul className="space-y-1.5 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Right of access</strong> — to obtain a copy of personal data we hold</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Right to rectification</strong> — to correct inaccurate data</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Right to erasure</strong> — to request deletion where retention is no longer necessary</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Right to restriction</strong> — to limit processing in certain circumstances</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Right to data portability</strong> — to receive data in a structured, machine-readable format</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Right to object</strong> — to processing based on legitimate interests</span></li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Requests should be directed to{' '}
              <a href="mailto:neil@personaify.io" className="text-slate-700 hover:text-slate-900 underline underline-offset-2">neil@personaify.io</a>. We will respond within one calendar month. Platform users may also lodge a complaint with the Information Commissioner's Office at ico.org.uk.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Clients wishing to exercise rights on behalf of their end-customers should direct such requests to Growth Room via the same address. We will assist Clients in fulfilling data subject rights requests in respect of data we hold as processor.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">12. Cookies</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              The authenticated Growth Room platform uses essential session cookies only, for the purpose of maintaining logged-in sessions. No third-party advertising or tracking cookies are set within the authenticated platform. Hotjar may set its own cookies for session recording purposes (see Section 10). A separate cookie notice applies to any public-facing Growth Room marketing site.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">13. Changes to this policy</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              We will update this policy as the platform evolves, in particular as new integrations are added to the sub-processor list in Section 5. Where changes are material, we will notify Client account holders by email or in-platform notification with reasonable notice before the change takes effect. The effective date at the top of this document reflects the current version.
            </p>
          </section>

          {/* 14 */}
          <section className="pb-2">
            <h2 className="text-base font-semibold text-slate-900 mb-3">14. Contact</h2>
            <p className="text-base text-slate-700 leading-relaxed">For questions, rights requests, or concerns relating to this policy:</p>
            <div className="mt-3 text-base text-slate-700 leading-relaxed">
              <p className="font-medium text-slate-900">Growth Room (Neil Minty t/a Personaify)</p>
              <p>
                Email:{' '}
                <a href="mailto:neil@personaify.io" className="text-slate-700 hover:text-slate-900 underline underline-offset-2">neil@personaify.io</a>
              </p>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Growth Room is a trading name of Neil Minty t/a Personaify. This policy is governed by the laws of England and Wales.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
