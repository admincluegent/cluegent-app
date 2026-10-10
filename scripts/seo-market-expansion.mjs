// Five different recruitment tasks; country names are not interchangeable template inputs.
export const marketDate = "2026-10-10";
const defaults = { publishedDate: marketDate, modifiedDate: marketDate, excludePromoSnippet: true };
export const marketPosts = [
  {
    ...defaults, slug: "canada-co-op-student-interview-preparation", country: "CA", language: "en-CA",
    keyword: "co op student interview questions", intent: "Turn student project evidence into a Canadian co-op interview preparation sheet",
    title: "Co-op Student Interview Questions: Canada Prep Worksheet",
    description: "Prepare for a Canadian co-op student interview with project examples, a role-fit worksheet and questions about the work term. Practise without inventing experience.",
    h1: "Co-op student interview questions: preparation for Canada",
    authorityKicker: "Canadian student placement preparation",
    summary: "Prepare evidence from coursework, volunteering or part-time work, then connect it to the actual co-op posting. Use this worksheet for the employer conversation, not as a substitute for your university's placement rules.",
    bodyHtml: `<section id="start"><h2>Match your student experience to the co-op role</h2>
      <p>For a Canadian co-op student interview, prepare examples that show how you learn, contribute to a project and respond when something goes wrong. Save the résumé and posting you submitted. You can discuss coursework and volunteering honestly without presenting them as paid industry experience.</p>
      <p>The University of Waterloo's preparation guidance includes skills reflection and experience from school projects, clubs and volunteering. Its recruitment process is specific to its programmes. Other universities and employers can use different arrangements, so confirm the process with your own co-op adviser.</p>
      <p>This guide concerns student work placements. Search results for “co-op interview” can also refer to retail employers or housing boards; their questions do not necessarily match a student placement. Use the role description to decide which preparation matters.</p></section>
      <section id="worksheet"><h2>Build a project evidence sheet</h2>
      <p>Choose one project you can explain in detail. Record what the team wanted to deliver, your own contribution, one difficult decision and what you learnt. Keep the evidence small enough that you can answer a follow-up without changing the story.</p>
      <table><caption>Student evidence worksheet</caption><thead><tr><th scope="col">Posting requirement</th><th scope="col">Evidence to prepare</th></tr></thead><tbody>
      <tr><th scope="row">Work with others</th><td>A team assignment, your responsibility and a disagreement you helped resolve.</td></tr>
      <tr><th scope="row">Learn a tool</th><td>What you studied, how you tested understanding and where you still need help.</td></tr>
      <tr><th scope="row">Check accuracy</th><td>A mistake you identified and a check you added afterwards.</td></tr>
      <tr><th scope="row">Explain a result</th><td>A demonstration, report or piece of feedback you can describe accurately.</td></tr>
      </tbody></table>
      <p>A class exercise can show useful behaviour. Identify it as a class exercise and describe its limits. Avoid inventing customers, revenue or a percentage improvement to make it sound professional.</p></section>
      <section id="questions"><h2>Practise questions about learning and contribution</h2>
      <ul><li>Which project best shows a skill this posting requires?</li><li>What did you personally implement or check?</li><li>How did you handle something you had not learnt before?</li><li>What would you change if you repeated the project?</li><li>How do you decide when to ask for help?</li></ul>
      <p>These are original practice prompts, not leaked employer questions. Ask a partner to follow up on a claim rather than simply reading the whole list. The follow-up reveals whether you understand your own example.</p></section>
      <section id="example"><h2>Explain a coursework example with a clear boundary</h2>
      <p>Our fictional student helped build a small appointment prototype in a course. An illustrative answer is: “My responsibility was checking the booking inputs and writing test cases. I found that our implementation accepted an end time before the start time. I discussed the expected behaviour with my teammate and added tests after we agreed the rule. The project was coursework, so I have not operated it for real users.”</p>
      <p>Prepare the follow-ups: what input exposed the issue, what you changed and how the team reviewed it. If someone else implemented the fix, say so. Your contribution can still be useful evidence of careful work.</p>
      <p>For a technical follow-up, practise <a href="/blog/code-review-interview-practice-exercise/">reviewing a booking patch</a>. It is a different task from describing your submitted project.</p></section>
      <section id="logistics"><h2>Clarify the work term and supervision</h2>
      <p>Ask about the tasks a student would start with, who reviews the work and how feedback is given. Confirm the location, dates and interview arrangements against the posting and your university's requirements. Do not assume a work-term duration or ranking procedure applies everywhere in Canada.</p>
      <p>If compensation is discussed, clarify the currency, pay period and what the quoted amount includes. This guide provides no market salary figure or immigration advice. Use your institution and appropriate official resources for programme and eligibility questions.</p></section>
      <section id="practice"><h2>Run a student-project rehearsal</h2>
      <p>Answer one project question aloud, then ask for a challenge about your contribution. Use the <a href="/resources/mock-interview-scorecard/">free mock interview scorecard</a> to note clarity, evidence and unanswered follow-ups.</p>
      <p>For optional preparation, give Cluegent a redacted résumé and a typed practice question. Ask it to flag unsupported claims instead of inventing stronger experience. <a href="/download/" data-analytics-event="download_click" data-analytics-location="canada-guide">Try Cluegent for interview preparation</a> on Windows or macOS; check current trial and paid terms. During a real assessment, follow the employer's permitted-tool rules.</p>
      <p>The scenario and prompts are original practice material. They do not reproduce an employer's test or guarantee a placement.</p></section>`,
    faqs: [{q:"Can I use a class project in a co-op interview?",a:"Use truthful, relevant coursework and explain your own contribution. Do not describe it as commercial work if it was a class exercise."},{q:"Do all Canadian co-op programmes use Waterloo's process?",a:"No. Check your own institution's recruitment requirements and the employer's posting."},{q:"What should I ask a co-op employer?",a:"Ask about initial tasks, supervision, feedback, location and work-term arrangements relevant to the posting."}],
    sources: [["https://uwaterloo.ca/future-students/welcome/preparing-co-op", "University of Waterloo: preparing for co-op"]],
    links: [["/blog/take-home-coding-assignment-readme/", "Prepare a technical project handover"], ["/resources/mock-interview-scorecard/", "Free practice scorecard"]]
  },
  {
    ...defaults, slug: "australia-aps-interview-evidence-work-sample", country: "AU", language: "en-AU",
    keyword: "aps interview preparation", intent: "Connect an Australian APS application pitch to panel evidence and a work sample",
    title: "APS Interview Preparation: Evidence & Work-Sample Practice",
    description: "Prepare for an Australian APS interview with an application-to-evidence map, hypothetical scenario and work-sample checklist. Follow the agency's information pack.",
    h1: "APS interview preparation: connect your application to evidence",
    authorityKicker: "Australian Public Service interview practice",
    summary: "Review your submitted pitch, prepare additional evidence and practise explaining a hypothetical work sample. Use the agency's instructions rather than assuming every APS interview follows one format.",
    bodyHtml: `<section id="start"><h2>Use the agency's information pack as the brief</h2>
      <p>For APS interview preparation, review your application and the job requirements, then prepare examples you can discuss beyond the wording of your pitch. The Australian Public Service Commission describes behavioural and hypothetical questions, with other assessment activities possible. Your agency's invitation determines the actual format.</p>
      <p>This guide is an original preparation worksheet for applicants to the Australian Public Service. It does not provide official marks, selection criteria for every role or a predicted question list. Keep the advertised responsibilities and level beside you while preparing.</p></section>
      <section id="map"><h2>Map the submitted pitch to follow-up evidence</h2>
      <p>Highlight each claim in the application you submitted. For each, record one action you took, why you chose it and an outcome you can describe. Prepare an additional example where possible so the interview can go beyond repeating your written response.</p>
      <table><caption>Application-to-interview evidence map</caption><thead><tr><th scope="col">Claim in your application</th><th scope="col">Follow-up preparation</th></tr></thead><tbody>
      <tr><th scope="row">Organised competing tasks</th><td>Explain the deadlines, dependencies and why you changed the order.</td></tr>
      <tr><th scope="row">Communicated clearly</th><td>Identify the audience, their confusion and the wording you changed.</td></tr>
      <tr><th scope="row">Worked with a team</th><td>Separate your decision from the team's final result.</td></tr>
      <tr><th scope="row">Used sound judgement</th><td>Describe the alternative, missing evidence and your authority boundary.</td></tr>
      </tbody></table>
      <p>Keep examples accurate. A result you observed without a measurement should be described as an observation. Do not add a success rate that was never recorded.</p></section>
      <section id="scenario"><h2>Practise a hypothetical request for a briefing note</h2>
      <p>In our fictional exercise, a manager needs a short briefing by the end of the day. Two internal reports give different counts, a colleague has not confirmed which definition is current, and the draft is due for review before it can be circulated. Explain your actions without assuming you can approve or publish the note yourself.</p>
      <p>A useful response might be: “I would clarify the decision the briefing supports and identify the owner of the count definition. I would compare the reports' scope and dates, then document the unresolved difference. I would prepare the parts supported by evidence and tell the reviewer what remains uncertain before the review deadline.”</p>
      <p>This response distinguishes a hypothetical plan from a past achievement. If asked for an experience example instead, use something you actually did. Do not retell the fictional case as employment history.</p></section>
      <section id="sample"><h2>Turn the scenario into a short work sample</h2>
      <p>Write a practice note with a recommendation, known facts, unresolved questions and next actions. Keep it short enough that a reviewer can identify the decision. This is our suggested exercise, not a format imposed by the APSC.</p>
      <ol><li>Name the request and the deadline.</li><li>State the verified information and its source.</li><li>Explain the conflicting definition without hiding it.</li><li>Give the next check, owner and review point.</li></ol>
      <p>Ask a partner whether your note makes uncertainty understandable. If they cannot tell whether the figures are confirmed, revise the wording before adding presentation polish.</p></section>
      <section id="panel"><h2>Prepare for the panel's follow-ups</h2>
      <ul><li>What would you do if the information owner cannot respond in time?</li><li>Which part of the task can you complete without that answer?</li><li>Who should approve the final note?</li><li>What did you learn from a similar past situation?</li></ul>
      <p>The APSC recommends reviewing the agency and application and practising against the job description. Use the invitation to clarify any required work sample, presentation or permitted notes. Ask for clarification when you do not understand the question, rather than answering a different one.</p></section>
      <section id="practice"><h2>Keep practice evidence separate from official assessment</h2>
      <p>Use our <a href="/resources/mock-interview-scorecard/">practice scorecard</a> for your own clarity checks. Its categories are not APS panel marks. Save the actual invitation and information pack so practice advice does not override the agency's instructions.</p>
      <p>Cluegent can help review typed preparation prompts and challenge vague claims. <a href="/download/" data-analytics-event="download_click" data-analytics-location="australia-guide">Try Cluegent for APS interview practice</a>, check current product terms and redact confidential examples. During the assessment, use assistance only where the agency permits it.</p></section>`,
    faqs: [{q:"Are APS interviews always behavioural?",a:"The APSC describes behavioural and hypothetical questions and possible other assessments. Follow the particular agency's invitation."},{q:"Should I repeat my written pitch word for word?",a:"Prepare to explain its evidence and decisions, and have additional truthful examples where relevant."},{q:"Is this worksheet an official APS scoring guide?",a:"No. The worksheet, scenario and review prompts are original Cluegent practice material."}],
    sources: [["https://www.apsc.gov.au/working-aps/joining-aps/cracking-code/7-interview-and-other-assessment-cracking-code", "APSC: the interview and other assessment"]],
    links: [["/blog/assessment-centre-in-tray-exercise/", "Additional administrative practice exercise"], ["/resources/mock-interview-scorecard/", "Free practice scorecard"]]
  },
  {
    ...defaults, slug: "singapore-skills-framework-interview-evidence", country: "SG", language: "en-SG",
    keyword: "skills framework interview preparation singapore", intent: "Use a Singapore Skills Framework role description to build an interview evidence and gap map",
    title: "Singapore Interview Prep: Skills Framework Evidence Map",
    description: "Use Singapore's Skills Framework as a reference for interview preparation. Map role requirements to evidence, identify skill gaps and explain a career switch honestly.",
    h1: "Singapore interview preparation: build a skills evidence map",
    authorityKicker: "Singapore career-switch preparation",
    summary: "Connect a target role's responsibilities to evidence from your own work. Use a Skills Framework as a reference, then check the employer's actual requirements and explain the gaps you still need to close.",
    bodyHtml: `<section id="start"><h2>Use the framework to investigate the role</h2>
      <p>For interview preparation in Singapore, a relevant Skills Framework can help you understand a role and organise questions about its skills. SkillsFuture's official FAQ describes occupation and role information as useful for career choices and interview preparation. Employers can adapt requirements to their own context.</p>
      <p>Start with the actual vacancy. Select a relevant framework description as a reference, then compare it with the posting. A framework is not a certificate that you possess every listed skill, and this exercise does not determine eligibility for a job or training programme.</p>
      <p>This guide serves a different task from a general <a href="/blog/career-change-interview-questions/">career-change interview question list</a>: building a requirement, evidence and learning-gap map for one target role.</p></section>
      <section id="map"><h2>Build an evidence and gap map</h2>
      <p>Choose a responsibility from the vacancy and describe what competent work would look like. Then identify something you actually did that relates to it. Label the boundary between demonstrated experience, a practice exercise and a skill you have not yet used.</p>
      <table><caption>Our interview evidence worksheet</caption><thead><tr><th scope="col">Field</th><th scope="col">What to record</th></tr></thead><tbody>
      <tr><th scope="row">Target responsibility</th><td>The employer's wording and the relevant framework description.</td></tr>
      <tr><th scope="row">Evidence</th><td>A real action, decision and outcome you can explain.</td></tr>
      <tr><th scope="row">Transfer</th><td>What carries over and what changes in the new setting.</td></tr>
      <tr><th scope="row">Gap</th><td>A specific task you have not performed independently.</td></tr>
      <tr><th scope="row">Next check</th><td>A learning exercise or question that tests the missing skill.</td></tr>
      </tbody></table>
      <p>Do not copy a complete framework's terminology into an answer. Select the requirements that matter to the vacancy and translate them into actions you understand. If you cannot explain a term, investigate it before claiming competence.</p></section>
      <section id="case"><h2>Practise a switch from operations to reporting support</h2>
      <p>Our fictional applicant works in operations and wants a reporting-support role. They have reconciled daily records and explained discrepancies to colleagues. They have completed a small SQL practice project, but have not maintained a production reporting pipeline.</p>
      <p>An illustrative answer is: “My operations work involved checking whether records matched and explaining differences to the team. That experience is relevant to investigating report discrepancies. I have practised SQL joins in a small project, but I have not maintained a production pipeline. I would like to understand which reporting tasks this role expects me to handle independently.”</p>
      <p>The answer identifies transferable evidence and a real learning boundary. It does not turn a completed course into employment experience. Replace the fictional details with your own work before using the structure.</p></section>
      <section id="test"><h2>Test the gap with a small artefact</h2>
      <p>For this practice case, make a synthetic dataset with unmatched records and write down the expected result before querying it. Explain why a join returns more rows than you expected. Keep the project small enough that you can defend every transformation.</p>
      <p>Our <a href="/blog/data-analyst-dashboard-case-interview/">conflicting-dashboard exercise</a> provides a separate case for metric definitions. Use it to check whether your technical answer still addresses the business question.</p>
      <ul><li>What proves the existing skill transfers to this role?</li><li>What context changes in the new job?</li><li>Which task would require support initially?</li><li>How would you demonstrate progress beyond attending a course?</li></ul></section>
      <section id="questions"><h2>Ask the employer about independent responsibility</h2>
      <p>Ask which tasks the new hire owns, how work is reviewed and which skills are expected from the start. Discuss a development plan without assuming the employer offers a particular training benefit. Use official providers for questions about funding, qualifications or programme eligibility.</p>
      <p>Prepare a short explanation of why this specific role fits your evidence and interests. Avoid blaming a former employer or describing every previous task as irrelevant. The new role should be understandable from the responsibility you want to take on.</p></section>
      <section id="practice"><h2>Review one claim at a time</h2>
      <p>Ask a practice partner to challenge one line of the map. If the evidence does not support the claim, narrow the claim or identify the next learning task. Keep the framework reference and employer posting separate so you can explain where each requirement comes from.</p>
      <p>For optional typed-prompt feedback, <a href="/download/" data-analytics-event="download_click" data-analytics-location="singapore-guide">try Cluegent for career-switch interview practice</a>. Ask for questions about your evidence, redact personal information and check current terms. Follow the employer's rules for assistance during an actual assessment. This original exercise does not guarantee a job or establish your qualification.</p></section>`,
    faqs: [{q:"Can I use a Skills Framework for interview preparation?",a:"Use a relevant framework as a role and skills reference, then compare it with the actual employer requirements and your own evidence."},{q:"Does completing a course prove I can do the job?",a:"A course can support learning, but explain what you can demonstrate and which tasks you have not performed independently."},{q:"Must an employer use the framework exactly as written?",a:"SkillsFuture's FAQ says employers can adapt framework content to their context. Follow the actual vacancy and interview brief."}],
    sources: [["https://www.skillsfuture.gov.sg/skills-framework/skills-frameworks-faq", "SkillsFuture Singapore: Skills Framework FAQ"]],
    links: [["/blog/career-change-interview-questions/", "General career-change interview questions"], ["/blog/data-analyst-dashboard-case-interview/", "Reporting case practice"]]
  }
];
marketPosts.push(
  {
    ...defaults, slug: "fr/entretien-alternance-questions-exemples", country: "FR", language: "fr-FR",
    keyword: "entretien alternance questions", intent: "Préparer les preuves de motivation et les questions sur les missions d'une alternance",
    title: "Entretien d’alternance : questions et exemples de réponses",
    description: "Préparez votre entretien d’alternance avec des questions, un exemple de réponse et une fiche reliant formation, missions et réalisations personnelles.",
    h1: "Entretien d’alternance : préparer ses réponses avec des exemples",
    authorityKicker: "Préparation aux entretiens en France",
    summary: "Reliez votre formation aux missions proposées. Préparez des exemples sincères et des questions sur l’accompagnement, sans apprendre un discours qui ne correspond pas à votre parcours.",
    bodyHtml: `<section id="commencer"><h2>Partir de l’offre et de votre formation</h2>
      <p>Pour préparer un entretien d’alternance, identifiez les missions de l’offre, ce que votre formation vous a déjà appris et ce que vous souhaitez découvrir en entreprise. Préparez une réalisation que vous pouvez expliquer. Un projet de cours peut être pertinent si vous le présentez comme tel.</p>
      <p>France Travail conseille de montrer ses compétences à travers des réalisations et de s’entraîner à l’entretien. La fiche ci-dessous transforme ce conseil en exercice. Elle ne reprend pas les questions d’un recruteur précis et ne promet pas l’obtention d’un contrat.</p>
      <p>Conservez l’offre, le CV envoyé et les informations de votre établissement. Vérifiez les dates et le rythme de formation avant de les annoncer. Les modalités dépendent de votre situation et des documents disponibles ; ce guide ne fixe pas de conditions juridiques ni de rémunération.</p></section>
      <section id="fiche"><h2>Préparer une fiche de correspondance</h2>
      <p>Choisissez deux missions de l’offre. Pour chacune, notez une expérience réelle, votre contribution et une question sur ce que l’entreprise attend. Vous pouvez utiliser un projet, une activité associative ou un emploi étudiant. Distinguez ce que vous avez fait seul de ce qui a été réalisé par le groupe.</p>
      <table><caption>Fiche de préparation à l’entretien</caption><thead><tr><th scope="col">Élément à préparer</th><th scope="col">Contenu utile</th></tr></thead><tbody>
      <tr><th scope="row">Mission proposée</th><td>Une tâche décrite dans l’offre, avec vos propres mots.</td></tr>
      <tr><th scope="row">Expérience pertinente</th><td>Un exemple précis et le contexte dans lequel vous avez appris.</td></tr>
      <tr><th scope="row">Contribution personnelle</th><td>Une action, une décision ou une vérification que vous avez effectuée.</td></tr>
      <tr><th scope="row">Besoin d’apprentissage</th><td>Une tâche pour laquelle vous aurez encore besoin d’accompagnement.</td></tr>
      <tr><th scope="row">Organisation</th><td>Les informations de formation à confirmer avec votre établissement et l’entreprise.</td></tr>
      </tbody></table>
      <p>Évitez de remplir la fiche avec des qualités générales comme « motivé » ou « sérieux ». Décrivez ce que vous avez fait. Si vous ne disposez pas d’un résultat chiffré, expliquez ce que vous avez observé sans inventer de pourcentage.</p></section>
      <section id="questions"><h2>Questions pour travailler vos réponses</h2>
      <ul><li>Pourquoi avez-vous choisi cette formation ?</li><li>Quelle mission de cette offre vous intéresse particulièrement ?</li><li>Quel projet montre une compétence utile pour cette mission ?</li><li>Comment réagissez-vous lorsque vous ne comprenez pas une consigne ?</li><li>Qu’aimeriez-vous apprendre pendant cette alternance ?</li></ul>
      <p>Répondez à une question, puis demandez une relance sur votre exemple. L’objectif est de vérifier que vous pouvez expliquer vos choix. Ces questions sont des propositions d’entraînement, pas une liste officielle à réciter.</p></section>
      <section id="exemple"><h2>Exemple de réponse à adapter à votre parcours</h2>
      <p>Dans notre situation fictive, une candidate postule à une alternance avec des missions de support et de suivi des demandes. Elle a participé à un projet de cours dans lequel son groupe devait présenter un outil à d’autres étudiants.</p>
      <p>Elle pourrait répondre : « La partie support de votre offre m’intéresse parce que j’aime comprendre ce qui bloque un utilisateur. Dans un projet de cours, j’ai recueilli les questions des étudiants après notre démonstration et proposé une fiche expliquant les étapes difficiles. Je n’ai pas encore travaillé dans un service support. J’aimerais apprendre comment votre équipe suit les demandes et décide quand les transmettre à un collègue. »</p>
      <p>La réponse relie une mission à une expérience et à un besoin d’apprentissage. Elle ne transforme pas un projet de cours en expérience professionnelle. Remplacez chaque détail par un élément réel avant de reprendre la structure.</p>
      <p>Préparez aussi les relances : quelles questions avez-vous recueillies, qu’avez-vous changé et comment avez-vous vérifié que la fiche était compréhensible ? Une réponse courte peut être solide si vous pouvez développer les faits ensuite.</p></section>
      <section id="recruteur"><h2>Questions à poser sur les missions et l’accompagnement</h2>
      <p>Demandez quelles tâches vous réaliserez au début, qui pourra répondre à vos questions et comment votre progression sera évaluée. Vous pouvez aussi clarifier les outils utilisés et la manière dont les priorités sont fixées. Ces informations vous aident à comprendre le travail proposé.</p>
      <ul><li>Quelles seraient les premières missions confiées ?</li><li>Comment l’accompagnement est-il organisé dans l’équipe ?</li><li>Quels éléments devons-nous confirmer avec mon établissement ?</li><li>Quelle est la prochaine étape du recrutement ?</li></ul>
      <p>Pour les questions concernant le contrat, le calendrier ou les conditions de l’alternance, vérifiez les documents avec les interlocuteurs compétents. Une réponse générée par une IA ne remplace pas cette vérification.</p></section>
      <section id="entrainement"><h2>S’entraîner avec une relance concrète</h2>
      <p>Présentez votre projet à un proche, puis demandez-lui de choisir un point à approfondir. Notez ce qui reste vague et reprenez seulement cette partie. Vous pouvez ensuite essayer de répondre sans lire la fiche.</p>
      <p>Pour une préparation facultative, utilisez une question écrite dans Cluegent et demandez une relance sur vos propres faits. Retirez les données personnelles et confidentielles. <a href="/download/" lang="en" data-analytics-event="download_click" data-analytics-location="france-guide">Essayer Cluegent pour préparer un entretien</a> : la page de téléchargement est en anglais. Vérifiez les conditions actuelles de l’essai et de l’offre payante. Pendant un entretien réel, respectez les règles de l’employeur sur l’assistance.</p></section>`,
    faqs: [{q:"Que dire en entretien d’alternance sans expérience professionnelle ?",a:"Présentez un projet de cours, une activité associative ou une autre expérience réelle. Expliquez votre contribution et ce que vous souhaitez apprendre."},{q:"Faut-il apprendre ses réponses par cœur ?",a:"Préparez les faits et entraînez-vous à les expliquer. Adaptez votre réponse à la question au lieu de réciter un texte."},{q:"Quelles questions poser au recruteur ?",a:"Interrogez-le sur les premières missions, l’accompagnement, les informations à confirmer avec votre établissement et les étapes suivantes."}],
    sources: [["https://www.francetravail.fr/actualites/le-dossier/alternance/les-demarches-pour-poser-sa-cand.html", "France Travail : poser sa candidature en alternance"]],
    links: [["/blog/", "Autres guides, principalement en anglais"]]
  },
  {
    ...defaults, slug: "es/entrevista-practicas-preguntas-ejemplos", country: "ES", language: "es-ES",
    keyword: "entrevista prácticas preguntas", intent: "Preparar una entrevista de prácticas en España mediante un proyecto académico y preguntas de supervisión",
    title: "Entrevista de prácticas: preguntas y ejemplos de respuestas",
    description: "Prepara una entrevista de prácticas con un proyecto académico, ejemplos de respuestas y preguntas sobre tareas, supervisión y aprendizaje en la empresa.",
    h1: "Entrevista de prácticas: preguntas y ejemplos para prepararte",
    authorityKicker: "Preparación de entrevistas en España",
    summary: "Explica lo que has aprendido y cómo trabajaste en un proyecto. Prepara preguntas sobre las tareas y el apoyo disponible sin presentar tus estudios como experiencia profesional.",
    bodyHtml: `<section id="inicio"><h2>Relaciona tu formación con las tareas de la oferta</h2>
      <p>Para preparar una entrevista de prácticas, lee la oferta y el CV que enviaste. Elige un proyecto académico que puedas explicar y relaciona una parte de tu trabajo con las tareas propuestas. Si todavía no tienes experiencia laboral, puedes describir lo que has hecho en clase, en una asociación o en otra actividad real.</p>
      <p>Esta guía está dirigida a estudiantes que buscan prácticas en España. Los ejemplos son ejercicios originales, no preguntas filtradas de una empresa. El SEPE ofrece recursos públicos para preparar entrevistas; las instrucciones de tu centro y del empleador determinan los detalles de tu candidatura.</p>
      <p>Confirma las fechas y la documentación que te soliciten. Este artículo no establece las condiciones legales de las prácticas, su remuneración ni los requisitos de un convenio. Consulta esas cuestiones con los responsables correspondientes.</p></section>
      <section id="proyecto"><h2>Prepara un proyecto que puedas defender</h2>
      <p>Escoge un ejemplo pequeño y concreto. Describe el objetivo, lo que hiciste tú, una dificultad y cómo comprobaste el resultado. Una explicación precisa de una tarea limitada resulta más creíble que atribuirte todo el trabajo del grupo.</p>
      <table><caption>Ficha para explicar un proyecto académico</caption><thead><tr><th scope="col">Pregunta</th><th scope="col">Qué preparar</th></tr></thead><tbody>
      <tr><th scope="row">¿Qué había que conseguir?</th><td>El objetivo del ejercicio y las instrucciones que recibiste.</td></tr>
      <tr><th scope="row">¿Qué parte hiciste tú?</th><td>Una acción que puedas explicar y distinguir del trabajo de tus compañeros.</td></tr>
      <tr><th scope="row">¿Qué dificultad apareció?</th><td>Un error, una decisión o una información que faltaba.</td></tr>
      <tr><th scope="row">¿Cómo lo comprobaste?</th><td>Una prueba, una revisión o un comentario recibido.</td></tr>
      <tr><th scope="row">¿Qué necesitas aprender?</th><td>Una tarea que aún no has realizado de forma independiente.</td></tr>
      </tbody></table>
      <p>Si el resultado no se midió, no inventes cifras. Puedes explicar qué cambió y qué observaste. Identifica el ejemplo como académico si no se utilizó en una empresa o con clientes reales.</p></section>
      <section id="preguntas"><h2>Preguntas para practicar antes de la entrevista</h2>
      <ul><li>¿Por qué te interesan estas prácticas y sus tareas?</li><li>¿Qué proyecto muestra una habilidad útil para el puesto?</li><li>¿Cómo organizaste tu parte del trabajo?</li><li>¿Qué hiciste cuando no sabías cómo continuar?</li><li>¿Qué te gustaría aprender con el equipo?</li></ul>
      <p>Practica una pregunta y una repregunta sobre el mismo ejemplo. Pide a otra persona que te pregunte por una decisión concreta. Así comprobarás si tu respuesta se basa en hechos que entiendes y puedes desarrollar.</p></section>
      <section id="ejemplo"><h2>Ejemplo de respuesta sobre una revisión de datos</h2>
      <p>En nuestro caso ficticio, un estudiante solicita unas prácticas de apoyo al análisis. En un trabajo de clase, comparó dos hojas de cálculo que daban resultados distintos. Su responsabilidad fue revisar los registros, no diseñar el proyecto completo.</p>
      <p>Una respuesta ilustrativa sería: «En un proyecto de clase revisé por qué dos tablas daban totales diferentes. Comprobé que no incluían los mismos registros y expliqué la diferencia al grupo. Después acordamos qué datos debíamos comparar antes de calcular el resultado. Me interesa aprender cómo se hacen estas comprobaciones con datos y herramientas de una empresa».</p>
      <p>La respuesta distingue una acción demostrable de una experiencia que todavía no tienes. Sustituye los detalles por los tuyos. No presentes este caso ficticio como un proyecto realizado por ti.</p>
      <p>Prepara las repreguntas: ¿cómo detectaste los registros distintos?, ¿qué decisión tomaste?, ¿quién revisó tu conclusión? Si no recuerdas un detalle, reconoce la incertidumbre en lugar de improvisar una cifra o una herramienta que no utilizaste.</p></section>
      <section id="empresa"><h2>Pregunta cómo se organizará el aprendizaje</h2>
      <p>La entrevista también te permite entender las tareas. Pregunta qué harías al principio, quién revisaría tu trabajo y cómo se resolverían las dudas. Evita asumir que todas las ofertas de prácticas tienen la misma organización.</p>
      <ul><li>¿Cuáles serían las primeras tareas?</li><li>¿Con quién revisaría mi trabajo?</li><li>¿Qué herramientas debería conocer antes de empezar?</li><li>¿Qué información debo confirmar con mi centro?</li><li>¿Cuál es el siguiente paso del proceso?</li></ul>
      <p>Estas preguntas no sustituyen la revisión de los documentos de la oferta. Anota las respuestas y comprueba cualquier detalle pendiente con el interlocutor adecuado.</p></section>
      <section id="ensayo"><h2>Ensaya una respuesta y revisa su claridad</h2>
      <p>Explica tu ejemplo en voz alta sin leer cada frase. Comprueba si se entiende el objetivo, tu contribución y lo que aprendiste. Después trabaja la parte que quedó más vaga, en vez de memorizar un discurso completo.</p>
      <p>Para recibir comentarios sobre una pregunta escrita, puedes <a href="/download/" lang="en" data-analytics-event="download_click" data-analytics-location="spain-guide">probar Cluegent para preparar tu entrevista</a>. La página de descarga está en inglés. Elimina la información personal o confidencial y comprueba las condiciones actuales del producto. Durante una evaluación real, respeta las reglas del empleador sobre herramientas y asistencia.</p>
      <p>La preparación no garantiza conseguir unas prácticas. Su objetivo es que puedas explicar tu experiencia con precisión y hacer preguntas útiles sobre el trabajo.</p></section>`,
    faqs: [{q:"¿Qué puedo explicar si no tengo experiencia laboral?",a:"Usa un proyecto académico u otra actividad real. Identifica el contexto y describe tu aportación sin atribuirte el trabajo de otras personas."},{q:"¿Qué preguntas hago en una entrevista de prácticas?",a:"Pregunta por las primeras tareas, la revisión del trabajo, las herramientas, la información que debes confirmar con tu centro y el siguiente paso."},{q:"¿Estos ejemplos son respuestas que debo memorizar?",a:"No. Son ejercicios ficticios para entender la estructura. Utiliza tus propios hechos y responde a la pregunta concreta."}],
    sources: [["https://sepe.es/noticia/SEPE/2018/Marzo/entrevista-trabajo-youtube", "SEPE: recursos para preparar una entrevista de trabajo"]],
    links: [["/blog/", "Más guías, principalmente en inglés"]]
  }
);
export const marketSlugs = marketPosts.map(post => post.slug);

// Dedicated fully localised article chrome. These are different topics, not translated alternates.
export function renderLocalisedMarketArticle(post, { head, absolute, faqSchema, breadcrumbSchema }) {
  const french = post.language === "fr-FR";
  const label = french ? {
    nav: "Navigation", home: "Accueil (en anglais)", blog: "Guides (en anglais)", download: "Télécharger (en anglais)",
    hero: "Préparez vos exemples avec Cluegent", heroText: "Un assistant de bureau pour travailler vos réponses et vos questions de suivi avant l’entretien.",
    updated: "Publié le", sources: "Sources consultées", faq: "Questions fréquentes", related: "Autres ressources", disclosure: "Guide rédigé avec une assistance IA, relu pour la clarté et la cohérence des sources. Aucune validation par un relecteur humain francophone n’est revendiquée.",
    terms: "Conditions (en anglais)", privacy: "Confidentialité (en anglais)"
  } : {
    nav: "Navegación", home: "Inicio (en inglés)", blog: "Guías (en inglés)", download: "Descargar (en inglés)",
    hero: "Prepara tus ejemplos con Cluegent", heroText: "Un asistente de escritorio para trabajar tus respuestas y preguntas de seguimiento antes de la entrevista.",
    updated: "Publicado el", sources: "Fuentes consultadas", faq: "Preguntas frecuentes", related: "Otros recursos", disclosure: "Guía redactada con asistencia de IA y revisada para comprobar la claridad y la coherencia con las fuentes. No se afirma que haya sido validada por un revisor humano hispanohablante.",
    terms: "Condiciones (en inglés)", privacy: "Privacidad (en inglés)"
  };
  const escape = value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const canonical = `/blog/${post.slug}/`;
  const schema = [{"@context":"https://schema.org","@type":"Article",headline:post.h1,description:post.description,inLanguage:post.language,datePublished:post.publishedDate,dateModified:post.modifiedDate,mainEntityOfPage:absolute(canonical),author:{"@type":"Organization",name:"Cluegent",url:absolute("/about/")},publisher:{"@type":"Organization",name:"Cluegent",logo:{"@type":"ImageObject",url:absolute("/assets/icon.png")}}},faqSchema(post.faqs),breadcrumbSchema([{name:label.home,url:"/"},{name:post.h1,url:canonical}])];
  const pageHead = head({title:post.title,description:post.description,canonical,type:"article",schema}).replace("</head>", `<meta property="og:locale" content="${french ? "fr_FR" : "es_ES"}">\n</head>`);
  return `<!DOCTYPE html><html lang="${post.language}">${pageHead}<body><div class="page-shell seo-shell">
    <header class="site-header"><a class="brand" href="/" lang="en">Cluegent</a><nav class="site-nav" aria-label="${label.nav}"><a href="/blog/" lang="en">${label.blog}</a><a href="/download/" lang="en" data-analytics-event="download_click" data-analytics-location="localised-header">${label.download}</a></nav></header>
    <main><section class="seo-hero seo-hero--simple" data-nosnippet><div class="seo-hero-copy"><p class="section-kicker">Cluegent</p><h2>${label.hero}</h2><p>${label.heroText}</p></div></section>
    <article class="seo-article seo-article--after-hero"><header class="seo-article-header"><p class="section-kicker">${escape(post.authorityKicker)}</p><h1>${escape(post.h1)}</h1><p>${escape(post.summary)}</p><p class="seo-article-meta">${label.updated} <time datetime="${post.publishedDate}">${new Date(post.publishedDate+"T00:00:00Z").toLocaleDateString(post.language,{timeZone:"UTC",year:"numeric",month:"long",day:"numeric"})}</time></p></header>
    <div class="seo-article-body">${post.bodyHtml}<section><h2>${label.sources}</h2><ul>${post.sources.map(([href,text])=>`<li><a href="${escape(href)}" rel="noreferrer" target="_blank">${escape(text)}</a></li>`).join("")}</ul></section>
    <section><h2>${label.faq}</h2>${post.faqs.map(f=>`<h3>${escape(f.q)}</h3><p>${escape(f.a)}</p>`).join("")}</section><p>${label.disclosure}</p></div></article>
    <section class="seo-section seo-related"><h2>${label.related}</h2>${post.links.map(([href,text])=>`<a href="${href}" lang="en">${escape(text)}</a>`).join("")}</section></main>
    <footer class="site-footer"><p>Cluegent</p><a href="/terms.html" lang="en">${label.terms}</a><a href="/privacy.html" lang="en">${label.privacy}</a></footer></div><script src="/app.js?v=20260730-cta"></script></body></html>`;
}
