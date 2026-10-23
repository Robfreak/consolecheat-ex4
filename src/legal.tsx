function Slot({ children }: { children: string }) {
  return <span className="legal-slot">{children}</span>;
}

export function LegalPage({
  page,
  homeHref,
  onHome,
}: {
  page: "impressum" | "datenschutz";
  homeHref: string;
  onHome: (event: { preventDefault: () => void }) => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p>
        <a href={homeHref} onClick={onHome} className="text-sm font-medium text-steel underline-offset-4 hover:underline">
          Save-Info-Leser
        </a>
      </p>
      {page === "impressum" ? <Impressum /> : <Datenschutz />}
    </main>
  );
}

function Impressum() {
  return (
    <article id="impressum" className="mt-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Impressum</h1>
      <p className="mt-3 text-lg text-muted">Legal notice</p>
      <div lang="de" className="mt-8 flex flex-col gap-4 text-base leading-relaxed text-muted">
        <p className="panel rounded-xl px-4 py-4 text-fg">
          Platzhalter. Die markierten Felder sind keine echten Angaben. Es sind keine Namen, Adressen oder
          Kontaktdaten erfunden. Die betreibende Person setzt hier die eigenen Angaben ein.
        </p>
        <p>
          Anbieter: <Slot>[Name einsetzen]</Slot>
        </p>
        <p>
          Anschrift: <Slot>[Straße und Hausnummer einsetzen]</Slot>
        </p>
        <p>
          <Slot>[Postleitzahl und Ort einsetzen]</Slot>
        </p>
        <p>
          <Slot>[Land einsetzen]</Slot>
        </p>
        <p>
          E-Mail: <Slot>[E-Mail-Adresse einsetzen]</Slot>
        </p>
        <p>
          Telefon: <Slot>[Telefonnummer einsetzen]</Slot>
        </p>
        <p>
          Weitere Angaben, nur falls vorhanden (Registereintrag, Umsatzsteuer-ID, vertretungsberechtigte Person):{" "}
          <Slot>[falls vorhanden einsetzen]</Slot>
        </p>
        <p>Diese Seite ist ein inoffizielles Werkzeug. Nicht von Sony.</p>
      </div>
      <div lang="en" className="mt-10 flex flex-col gap-4 border-t border-line pt-8 text-base leading-relaxed text-muted">
        <p className="text-fg">
          Placeholders. The marked fields are not real details. No name, address, or contact was invented. The operator
          replaces them with their own details.
        </p>
        <p>
          Provider: <Slot>[insert name]</Slot>
        </p>
        <p>
          Address: <Slot>[insert street and house number]</Slot>
        </p>
        <p>
          <Slot>[insert postal code and city]</Slot>
        </p>
        <p>
          <Slot>[insert country]</Slot>
        </p>
        <p>
          Email: <Slot>[insert email address]</Slot>
        </p>
        <p>
          Phone: <Slot>[insert phone number]</Slot>
        </p>
        <p>
          Further details, only if they exist (register, VAT id, person authorized to represent):{" "}
          <Slot>[insert if applicable]</Slot>
        </p>
        <p>This site is an unofficial tool. Not Sony.</p>
      </div>
    </article>
  );
}

function Datenschutz() {
  return (
    <article id="datenschutz" className="mt-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Datenschutz</h1>
      <p className="mt-3 text-lg text-muted">Privacy</p>
      <div lang="de" className="mt-8 flex flex-col gap-4 text-base leading-relaxed text-muted">
        <p>
          Diese Seite ist der Save-Info-Leser, eine statische Website. Die Dateien liegen auf GitHub Pages. Ein
          eigenes Backend gibt es nicht.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Keine Konten, keine Cookies, kein Tracking</h2>
        <p>Die Seite setzt keine Cookies. Es gibt keine Analyse, kein Werbenetz und kein Tracking.</p>
        <p>
          Es gibt keine Anmeldung und kein Benutzerkonto. Dieses Projekt speichert keine personenbezogenen Daten und
          gibt keine weiter.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Lokal, kein Upload, kein Netz</h2>
        <p>
          Die PARAM.SFO und, falls sie dabei liegt, icon0.png werden nur in diesem Browser-Tab gelesen. Die Bytes
          verlassen den Rechner nicht. Es gibt keinen Upload, keine Anfrage an einen Server dieses Projekts und keine
          andere Verbindung, um die Datei auszuwerten. Der Spielstand wird nicht gespeichert und nicht weitergegeben.
        </p>
        <p>
          Die Account-ID aus der Datei gehört zum PSN-Konto. Sie wird im Tab verdeckt gezeigt und erst nach einem Klick
          auf „Anzeigen“ lesbar. Auch dann bleibt sie im Tab. Sie wird nicht in den lokalen Speicher geschrieben und
          nicht gesendet.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Was im Browser bleibt</h2>
        <p>
          Erscheinungsbild und Sprache bleiben lokal im Browser (<span className="font-mono text-fg">localStorage</span>
          , Schlüssel <span className="font-mono text-fg">consolecheat-theme</span> und{" "}
          <span className="font-mono text-fg">consolecheat-lang</span>), damit die Wahl ein Neuladen übersteht. Diese
          Werte werden nicht hochgeladen. Der Spielstand steht nicht in diesem Speicher.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Schriften</h2>
        <p>
          Die Schriften Outfit und Source Sans 3 liegen auf demselben Host wie diese Seite. Beim Laden geht keine
          Anfrage an Google oder an einen anderen Dritten.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Hosting</h2>
        <p>
          GitHub liefert die Dateien über GitHub Pages aus. GitHub kann als Host Verbindungsdaten verarbeiten,
          insbesondere die IP-Adresse, den Zeitpunkt und die aufgerufene Adresse. Dieses Projekt betreibt keinen
          eigenen Server und erhält diese Protokolle nicht.{" "}
          <a
            href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
            className="text-steel underline-offset-4 hover:underline"
          >
            Datenschutzerklärung von GitHub
          </a>
          .
        </p>
        <p>
          Rechtsgrundlage für diese Verbindungsdaten ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse ist der
          technische Betrieb und die Absicherung des Hostings. Verarbeitet werden sie vom Host, nicht von diesem
          Projekt.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Title-ID</h2>
        <p>
          Ein Link auf der Title-ID öffnet den Title-ID-Finder, und nur wenn der Link angeklickt wird. Diese Seite lädt
          von dort nichts von selbst.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung, das Recht auf
          Widerspruch sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde. Solange im Impressum nur Platzhalter
          stehen, ist hier keine verantwortliche Stelle benannt. Anfragen zu den Hosting-Protokollen gehen an den Host.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Verantwortliche Stelle</h2>
        <p>
          Name und Anschrift stehen im Impressum. Solange dort nur Platzhalter stehen, sind hier absichtlich keine
          echten Kontaktdaten eingetragen.
        </p>
      </div>
      <div lang="en" className="mt-10 flex flex-col gap-4 border-t border-line pt-8 text-base leading-relaxed text-muted">
        <p>
          This page is the Save-Info-Leser, a static website. The files are hosted on GitHub Pages. There is no
          separate backend.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">No accounts, no cookies, no tracking</h2>
        <p>This site does not set cookies. There is no analytics, no ad network, and no tracking.</p>
        <p>There is no sign-in and no account. This project does not store personal data and does not pass any on.</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Local, no upload, no network</h2>
        <p>
          The PARAM.SFO and, when it is included, icon0.png are read only in this browser tab. The bytes do not leave
          the computer. There is no upload, no request to a server run by this project, and no other connection to
          interpret the file. The save is not stored and not passed on.
        </p>
        <p>
          The account ID in the file belongs to the PSN account. It is shown masked in the tab and becomes readable
          only after a click on “Show”. Even then it stays in the tab. It is not written to local storage and it is not
          sent.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">What stays in the browser</h2>
        <p>
          Theme and language stay in the browser (<span className="font-mono text-fg">localStorage</span>, keys{" "}
          <span className="font-mono text-fg">consolecheat-theme</span> and{" "}
          <span className="font-mono text-fg">consolecheat-lang</span>) so the choice survives a reload. Those values
          are not uploaded. The save is not written there.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Fonts</h2>
        <p>
          Outfit and Source Sans 3 are served from the same host as this page. Loading the page does not contact Google
          or any other third party.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Hosting</h2>
        <p>
          GitHub serves the files through GitHub Pages. As the host, GitHub can process connection data, in particular
          the IP address, the time, and the requested address. This project does not run its own server and does not
          receive those logs.{" "}
          <a
            href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
            className="text-steel underline-offset-4 hover:underline"
          >
            GitHub Privacy Statement
          </a>
          .
        </p>
        <p>
          The legal basis for that connection data is Art. 6 (1) (f) GDPR. The legitimate interest is running and
          securing the hosting. The host processes it, not this project.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Title ID</h2>
        <p>
          A title-ID link opens the Title ID Finder, and only when the link is clicked. This page does not load
          anything from there on its own.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Your rights</h2>
        <p>
          You have the right of access, rectification, erasure, and restriction, the right to object, and the right to
          lodge a complaint with a supervisory authority. While the Impressum only has placeholders, no controller is
          named here. Questions about the hosting logs go to the host.
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Who is responsible</h2>
        <p>
          The name and address belong in the Impressum. While that page only has placeholders, no real contact details
          are published here on purpose.
        </p>
      </div>
    </article>
  );
}
