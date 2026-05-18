import { useEffect } from 'react';

export function GrowthRoomTerms() {
  useEffect(() => {
    document.title = 'Growth Room Terms of Service — Neil Minty';
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="max-w-2xl pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Legal</p>
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Growth Room Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-2">Updated: 18 May 2026</p>
        <p className="text-sm text-slate-500">Operated by Growth Room, Neil Minty trading as Personaify.</p>
        <p className="text-sm text-slate-500">
          Contact:{' '}
          <a href="mailto:neil@personaify.io" className="text-slate-700 hover:text-slate-900 underline underline-offset-2">
            neil@personaify.io
          </a>
        </p>
        <p className="text-base text-slate-700 leading-relaxed mt-6">
          These Terms of Service (Terms) govern access to and use of the Growth Room platform (Platform) by any organisation (Client) and its authorised users. By accessing the Platform, the Client agrees to be bound by these Terms. Schedule 1 to these Terms constitutes the Data Processing Agreement (DPA) required under UK GDPR Article 28.
        </p>

        <div className="mt-10 space-y-10">

          {/* 1 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">1. Definitions</h2>
            <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
              {[
                ['Platform', 'the Growth Room commercial intelligence software, including all agents, dashboards, edge functions, and integrations made available to the Client.'],
                ['Client', 'the merchant organisation that has entered into a service agreement with Growth Room and whose authorised users access the Platform.'],
                ['Authorised User', 'an individual granted platform access by the Client (org admin or viewer role).'],
                ['Client Data', "data ingested into the Platform from the Client's connected data sources, including Shopify order data, email engagement data from Klaviyo, and advertising data from Google and Meta."],
                ['Campaign Action', 'any platform-generated proposal or executed function that interacts with a third-party platform (e.g. creating a Meta campaign, issuing a Shopify discount code, syncing a Klaviyo segment).'],
                ['DPA', 'the Data Processing Agreement set out in Schedule 1 to these Terms.'],
                ['Sub-processor', 'a third-party processor engaged by Growth Room to process Client Data, as listed in the Privacy Policy and Schedule 1.'],
              ].map(([term, def]) => (
                <li key={term} className="flex gap-2">
                  <span className="text-slate-400 mt-1 shrink-0">•</span>
                  <span><strong className="font-medium text-slate-900">{term}:</strong> {def}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">2. Access and accounts</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Growth Room grants the Client a non-exclusive, non-transferable right to access and use the Platform during the subscription term, subject to these Terms.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              The Client is responsible for all Authorised Users' use of the Platform and for maintaining the confidentiality of login credentials. The Client must notify Growth Room promptly if it suspects unauthorised access.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              API credentials provided by the Client to connect third-party platforms (Shopify, Meta, Google, Klaviyo) are stored in an encrypted secret store (Supabase Vault). The Client is responsible for the validity, scope, and continued authority of credentials it provides. The Client must reconnect credentials if an access token expires or is revoked. Growth Room will notify the Client if a credential failure is detected, but takes no responsibility for data gaps resulting from expired credentials.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Meta access tokens expire every 60 days. Growth Room will attempt automated token refresh where technically possible. The Client is responsible for reconnecting if refresh fails.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">3. Platform functionality and limitations</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              The Platform's analytical capabilities are dependent on the data sources the Client connects and the tier of the Client's connected platforms. In particular:
            </p>
            <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-slate-400 mt-1 shrink-0">•</span>
                <span>Conversion rate data is unavailable on standard Shopify plans and requires the Shopify Analytics API, available on Advanced and Shopify Plus plans. Where data is unavailable, the Platform returns blank or demo-mode signals rather than an error.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400 mt-1 shrink-0">•</span>
                <span>Agent outputs depend on the quality and completeness of ingested data. Sparse order history, incomplete product catalogues, or restricted API scopes will reduce signal quality.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400 mt-1 shrink-0">•</span>
                <span>AI-generated outputs including content briefs, GEO schema suggestions, llms.txt files, and campaign proposals are produced by large language models and are suggestions only. They are not guaranteed to be accurate, complete, or free from error, hallucination, or bias.</span>
              </li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Growth Room will use reasonable endeavours to maintain Platform availability but does not guarantee uninterrupted access. Scheduled maintenance, third-party API outages, and infrastructure events may affect availability.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">4. Campaign execution</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              The Platform includes an Action Queue that generates campaign proposals for Client review. Campaign Actions may include audience targeting recommendations, discount code generation, Meta campaign creation, and Klaviyo segment sync.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              <strong className="font-medium text-slate-900">Approval requirement:</strong> all Campaign Actions must be approved by an authorised org admin before execution. The Platform enforces this at the database level (RLS policy <span className="font-mono text-sm bg-slate-100 px-1 rounded">org_admins_update</span>). No Campaign Action will execute automatically without explicit operator approval.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              <strong className="font-medium text-slate-900">Client liability for executed actions:</strong> once a Client approves a Campaign Action for execution, the Client assumes full responsibility for the commercial consequences of that action, including ad spend, discount redemption, and any customer communications triggered as a result.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              <strong className="font-medium text-slate-900">AI-generated recommendations:</strong> campaign proposals are generated by AI and reflect probabilistic recommendations based on available data. Growth Room makes no warranty that any recommended action will achieve a particular commercial outcome. The Client should apply its own commercial judgement before approving execution.
            </p>
            <p className="text-base text-slate-700 leading-relaxed">
              <strong className="font-medium text-slate-900">Customer segment transmission:</strong> where an approved Campaign Action transmits customer segment data to Meta or Klaviyo, the Client acknowledges and agrees that: (a) that transmission is made on the Client's instruction; (b) the Client is responsible for ensuring it has a lawful basis for that transmission under applicable data protection law; and (c) Growth Room's responsibility for that data ends at the point of transmission.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">5. Sub-processor activation and DPA gate</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              Campaign execution functions that transmit customer data to Meta or Klaviyo are disabled by default for all Client orgs. These functions will only be enabled for a Client org after:
            </p>
            <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-slate-400 mt-1 shrink-0">•</span>
                <span>The Client confirms in writing that Meta and/or Klaviyo (as applicable) are listed as sub-processors in the Client's own Data Processing Agreement with those platforms; and</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400 mt-1 shrink-0">•</span>
                <span>Growth Room has updated the Client's org configuration record (<span className="font-mono text-sm bg-slate-100 px-1 rounded">dpa_processors[]</span> flag) to reflect this confirmation.</span>
              </li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              The enabling mechanism is the org configuration flag, not the presence of API credentials. Credentials alone do not activate campaign execution functions. The Client must not request activation of these functions unless the relevant sub-processor listing is in place.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">6. AI-generated content disclaimer</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">
              The Platform uses AI (including the Anthropic Claude API) to generate content briefs, JSON-LD schema markup, llms.txt files, GEO gap analyses, and campaign copy suggestions. The Client acknowledges:
            </p>
            <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>All AI-generated content is a suggestion. It is not a professional, legal, or technical recommendation.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>JSON-LD schema markup should be validated and tested before implementation on live pages. Errors in schema markup may affect search engine indexing.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Content brief copy suggestions may contain inaccuracies, outdated information, or hallucinated facts. The Client is responsible for factual review before publication.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Growth Room does not warrant that AI-generated outputs are free from errors, bias, or content that may be unsuitable for the Client's audience.</span></li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Growth Room is not liable for any loss, damage, or regulatory consequence arising from the Client's use of AI-generated content without appropriate review.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">7. Credentials, API scopes, and termination</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              The Client is responsible for providing API credentials with the minimum scopes required by the Platform. Growth Room documents the API scopes it requests for each integration. The Client must not provide credentials with broader permissions than those documented, and Growth Room will not use permissions beyond what is documented and necessary.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">On termination of the Client's subscription:</p>
            <ul className="space-y-1.5 text-base text-slate-700 leading-relaxed mt-2">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>All API credentials stored in the Platform's secret store will be deleted within 30 days of termination.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Client Data will be deleted or anonymised within 30 days of termination, subject to the Client requesting a data export prior to deletion.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Authorised User accounts will be deactivated and org membership records deleted within the same window.</span></li>
            </ul>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Growth Room will provide a one-time data export on request if made within 14 days of termination notice.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">8. Multi-tenancy and data isolation</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Client Data is isolated from other Clients' data at the database level using row-level security (RLS) policies scoped to <span className="font-mono text-sm bg-slate-100 px-1 rounded">org_id</span>. Each Client can only access its own data within the Platform.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">9. Acceptable use</h2>
            <p className="text-base text-slate-700 leading-relaxed mb-3">The Client must not use the Platform to:</p>
            <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Execute campaign functions against customer segments unless the applicable sub-processor (Meta, Klaviyo) is listed in the Client's own DPA and the <span className="font-mono text-sm bg-slate-100 px-1 rounded">dpa_processors[]</span> flag has been activated (see Section 5).</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Connect API credentials with broader scopes than those documented and required by the Platform.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Process data relating to customers outside the jurisdiction of the connected Shopify store without first confirming that applicable data protection law permits such processing.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Attempt to access, query, or infer data belonging to another Client org.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Use the Platform to generate content intended to mislead consumers or make false claims about products.</span></li>
              <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Resell, sublicense, or make the Platform available to third parties without Growth Room's prior written consent.</span></li>
            </ul>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">10. Liability</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Growth Room's aggregate liability to the Client under or in connection with these Terms, whether in contract, tort (including negligence), breach of statutory duty, or otherwise, shall not exceed the total fees paid by the Client in the 12 months preceding the event giving rise to the claim.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Growth Room is not liable for: (a) indirect, consequential, or special loss; (b) loss of profit, revenue, or data; (c) any loss arising from the Client's reliance on AI-generated outputs without appropriate review; (d) any loss arising from Campaign Actions approved and executed by the Client; or (e) any loss arising from third-party API outages, rate limits, or policy changes.
            </p>
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">11. Changes to these Terms</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Growth Room may update these Terms, including Schedule 1, from time to time. Material changes, including additions to the sub-processor list, will be communicated to Client account holders with reasonable notice. Continued use of the Platform following the effective date of changes constitutes acceptance.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">12. Governing law</h2>
            <p className="text-base text-slate-700 leading-relaxed">
              These Terms are governed by the laws of England and Wales. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          {/* Schedule 1 */}
          <section>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Schedule 1</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Data Processing Agreement (DPA)</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                This DPA forms part of the Terms of Service and is entered into between Growth Room (Personaify Ltd) as Processor and each Client organisation as Controller, as required by UK GDPR Article 28.
              </p>

              <div className="space-y-8">

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 1. Definitions</h3>
                  <p className="text-base text-slate-700 leading-relaxed mb-3">Terms defined in the Terms of Service have the same meaning here. In addition:</p>
                  <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
                    {[
                      ['Controller', 'the Client, who determines the purposes and means of processing Client Data.'],
                      ['Processor', "Growth Room, who processes Client Data on the Controller's behalf."],
                      ['Data Subject', "an identified or identifiable natural person to whom personal data relates (in this context, end-customers of the Client's Shopify store and Authorised Users of the Platform)."],
                      ['Processing', 'any operation performed on personal data, as defined in UK GDPR Article 4(2).'],
                    ].map(([term, def]) => (
                      <li key={term} className="flex gap-2">
                        <span className="text-slate-400 mt-1 shrink-0">•</span>
                        <span><strong className="font-medium text-slate-900">{term}:</strong> {def}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 2. Processor obligations</h3>
                  <p className="text-base text-slate-700 leading-relaxed mb-3">Growth Room shall, as Processor:</p>
                  <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Process Client Data only on documented instructions from the Client, as set out in these Terms and the service agreement, and not for any other purpose.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Ensure that personnel authorised to process Client Data are bound by appropriate confidentiality obligations.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Implement the technical and organisational security measures described in the Privacy Policy and Section 8 of these Terms.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Not engage a sub-processor without prior written authorisation from the Client. The sub-processors listed in the Privacy Policy (Section 5) and DPA 4 below are pre-authorised by the Client's acceptance of these Terms.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Notify the Client if Growth Room believes an instruction infringes UK GDPR or other applicable data protection law.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Assist the Client in responding to Data Subject rights requests in respect of Client Data processed by Growth Room, to the extent technically feasible.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Assist the Client in complying with obligations under UK GDPR Articles 32–36 (security, breach notification, DPIAs, prior consultation) insofar as such assistance relates to data processed by Growth Room.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>On termination of the service agreement, delete or return all Client Data in accordance with the deletion obligations in Section 7 of these Terms, subject to retention required by applicable law.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Make available to the Client all information necessary to demonstrate compliance with this DPA, and permit and contribute to audits by the Client or an auditor mandated by the Client on reasonable notice.</span></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 3. Controller obligations</h3>
                  <p className="text-base text-slate-700 leading-relaxed mb-3">The Client, as Controller, warrants and agrees:</p>
                  <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>It has a lawful basis under UK GDPR for each category of personal data it instructs Growth Room to process, including for any transmission of customer segment data to sub-processors (Meta, Klaviyo).</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>It will ensure that Data Subjects have been informed of the processing described in this DPA to the extent required by applicable law.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>It will only instruct Growth Room to activate campaign execution sub-processors (Meta, Klaviyo) where those platforms are listed in the Client's own DPA with those processors.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>It will promptly inform Growth Room of any changes to its data protection requirements that may affect processing carried out under this DPA.</span></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 4. Authorised sub-processors</h3>
                  <p className="text-base text-slate-700 leading-relaxed mb-3">
                    The Client pre-authorises Growth Room to engage the sub-processors listed in Section 5 of the Privacy Policy, subject to:
                  </p>
                  <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Growth Room entering into written data processing agreements with each sub-processor imposing equivalent data protection obligations to those in this DPA.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Growth Room notifying the Client of any intended material change to the sub-processor list (addition or replacement) with reasonable notice, giving the Client the opportunity to object.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span>Where the Client objects to a new sub-processor on reasonable data protection grounds and Growth Room cannot accommodate the objection, either party may terminate the service agreement on 30 days' written notice without liability.</span></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 5. Data categories and processing details</h3>

                  {[
                    {
                      title: 'Platform user data',
                      rows: [
                        ['Categories of data', 'Name, email address, hashed password, session tokens, org membership records, invite tokens, activity logs.'],
                        ['Data subjects', 'Authorised Users (org admins and viewers).'],
                        ['Purpose', 'Platform access management and security.'],
                        ['Retention', 'As stated in the Privacy Policy, Section 8.'],
                      ],
                    },
                    {
                      title: 'End-customer data (Shopify)',
                      rows: [
                        ['Categories of data', 'shopify_customer_id (pseudonymous identifier), order history, order values, product types, cohort metrics derived therefrom. No names, email addresses, phone numbers, or physical addresses are stored.'],
                        ['Data subjects', "End-customers of the Client's Shopify store."],
                        ['Purpose', 'Commercial intelligence reporting, cohort analysis, LTV modelling, retention analytics.'],
                        ['Retention', 'As stated in the Privacy Policy, Section 8.'],
                      ],
                    },
                    {
                      title: 'Email engagement data (Klaviyo, where connected)',
                      rows: [
                        ['Categories of data', 'shopify_customer_id, Klaviyo profile properties, email engagement signals.'],
                        ['Data subjects', "End-customers subscribed to the Client's email programme."],
                        ['Purpose', 'Email segment performance analysis, retention signal processing.'],
                        ['Retention', 'As stated in the Privacy Policy, Section 8.'],
                      ],
                    },
                    {
                      title: 'Advertising data (Google, Meta, where connected)',
                      rows: [
                        ['Categories of data', "Campaign performance metrics, ad spend data, query data (GSC). No individual-level end-customer data ingested at source — campaign metrics are aggregated at platform level."],
                        ['Data subjects', "Platform users (indirect) and Client's ad audiences (aggregated, not individual)."],
                        ['Purpose', 'Paid and organic performance intelligence.'],
                      ],
                    },
                  ].map(({ title, rows }) => (
                    <div key={title} className="mt-5">
                      <p className="text-sm font-semibold text-slate-700 mb-2">{title}</p>
                      <ul className="space-y-1.5 text-base text-slate-700 leading-relaxed">
                        {rows.map(([label, value]) => (
                          <li key={label} className="flex gap-2">
                            <span className="text-slate-400 mt-1 shrink-0">•</span>
                            <span><strong className="font-medium text-slate-900">{label}:</strong> {value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 6. Security measures</h3>
                  <p className="text-base text-slate-700 leading-relaxed mb-3">
                    Growth Room implements the following measures as Processor, in accordance with UK GDPR Article 32:
                  </p>
                  <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Pseudonymisation:</strong> end-customer data is processed using <span className="font-mono text-sm bg-slate-100 px-1 rounded">shopify_customer_id</span> as identity spine; no directly identifying fields are stored.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Encryption:</strong> all data encrypted in transit (TLS 1.2+) and at rest within Supabase infrastructure.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Access controls:</strong> row-level security policies at the database layer; Vault-encrypted credential storage; personnel access restricted to authorised individuals.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Availability and resilience:</strong> Supabase-managed EU infrastructure with built-in redundancy.</span></li>
                    <li className="flex gap-2"><span className="text-slate-400 mt-1 shrink-0">•</span><span><strong className="font-medium text-slate-900">Testing:</strong> security controls reviewed periodically; RLS policies tested as part of platform deployment.</span></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 7. Personal data breaches</h3>
                  <p className="text-base text-slate-700 leading-relaxed">
                    Growth Room shall notify the Client without undue delay, and in any event within 72 hours of becoming aware, of any personal data breach affecting Client Data. Notification will include: the nature of the breach; categories and approximate number of Data Subjects affected; likely consequences; and measures taken or proposed to address the breach.
                  </p>
                  <p className="text-base text-slate-700 leading-relaxed mt-3">
                    Growth Room shall cooperate with the Client in any investigation and shall provide all reasonable assistance required for the Client to meet its own notification obligations to the ICO and affected Data Subjects.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 8. International transfers</h3>
                  <p className="text-base text-slate-700 leading-relaxed">
                    Where Growth Room transfers Client Data to sub-processors outside the UK or EEA, it will ensure appropriate safeguards are in place as described in the Privacy Policy, Section 7. The Client pre-authorises those transfers subject to those safeguards.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">DPA 9. Term and termination</h3>
                  <p className="text-base text-slate-700 leading-relaxed">
                    This DPA remains in force for the duration of the service agreement and terminates automatically on its expiry or termination. Obligations of confidentiality and security survive termination. On termination, deletion obligations in Section 7 of the Terms of Service apply.
                  </p>
                </div>

              </div>
            </div>
          </section>

          <section className="pb-2">
            <p className="text-sm text-slate-500">
              Growth Room is a trading name of Neil Minty t/a Personaify. These Terms and the DPA are governed by the laws of England and Wales.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
