import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.resolve(__dirname, "../packages/core/src/i18n/locales");

// 🇩🇪 GERMAN (DE) TRANSLATIONS - Statutory GRC & Enterprise Standard
const de = {
  navigation: {
    home: "Startseite",
    dashboard: "Dashboard",
    compliance: "Compliance",
    requirements: "Anforderungen",
    controls: "Kontrollen",
    policies: "Richtlinien",
    evidence: "Nachweise",
    risks: "Risikomanagement",
    threats: "Bedrohungen",
    vulnerabilities: "Schwachstellen",
    vendors: "Lieferanten & Dritte",
    assets: "Assets & Systeme",
    employees: "Mitarbeiter",
    training: "Schulungen",
    learning: "Weiterbildung",
    audit: "Audits & Prüfungen",
    reports: "Berichte",
    settings: "Einstellungen",
    profile: "Profil",
    logout: "Abmelden",
    login: "Anmelden",
    register: "Registrieren",
    menu: "Menü",
    close: "Schließen",
    back: "Zurück",
    next: "Weiter",
    previous: "Vorherige",
    skipToContent: "Zum Hauptinhalt springen",
    breadcrumb: {
      home: "Startseite",
      dashboard: "Dashboard"
    }
  },
  common: {
    app: {
      name: "ComplianceOS",
      tagline: "Plattform für Governance, Risikomanagement & Compliance"
    },
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      create: "Erstellen",
      update: "Aktualisieren",
      search: "Suchen",
      filter: "Filtern",
      export: "Exportieren",
      import: "Importieren",
      loading: "Wird geladen...",
      noData: "Keine Daten verfügbar",
      error: "Fehler",
      success: "Erfolgreich",
      warning: "Warnung",
      info: "Information",
      confirm: "Bestätigen",
      close: "Schließen",
      back: "Zurück",
      next: "Weiter",
      previous: "Vorherige",
      submit: "Absenden",
      reset: "Zurücksetzen",
      yes: "Ja",
      no: "Nein",
      all: "Alle",
      none: "Keine",
      select: "Auswählen",
      selectOption: "Option auswählen",
      required: "Erforderlich",
      optional: "Optional",
      enabled: "Aktiviert",
      disabled: "Deaktiviert",
      active: "Aktiv",
      inactive: "Inaktiv",
      pending: "Ausstehend",
      completed: "Abgeschlossen",
      inProgress: "In Bearbeitung",
      notStarted: "Nicht begonnen",
      seeAll: "Alle anzeigen",
      viewDetails: "Details anzeigen",
      viewMore: "Mehr anzeigen",
      less: "Weniger",
      more: "Mehr",
      actions: "Aktionen",
      status: "Status",
      date: "Datum",
      time: "Uhrzeit",
      name: "Name",
      description: "Beschreibung",
      type: "Typ",
      category: "Kategorie",
      notes: "Notizen",
      comments: "Kommentare",
      attachments: "Anhänge",
      createdAt: "Erstellt am",
      updatedAt: "Aktualisiert am",
      createdBy: "Erstellt von",
      modifiedBy: "Geändert von"
    },
    validation: {
      required: "Dieses Feld ist erforderlich",
      invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
      minLength: "Muss mindestens {{min}} Zeichen lang sein",
      maxLength: "Darf maximal {{max}} Zeichen lang sein",
      invalidNumber: "Bitte geben Sie eine gültige Zahl ein",
      invalidDate: "Bitte geben Sie ein gültiges Datum ein",
      invalidUrl: "Bitte geben Sie eine gültige URL ein"
    },
    errors: {
      generic: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
      networkError: "Netzwerkfehler. Bitte prüfen Sie Ihre Verbindung.",
      notFound: "Die angeforderte Ressource wurde nicht gefunden.",
      unauthorized: "Sie sind nicht berechtigt, diese Aktion auszuführen.",
      forbidden: "Zugriff verweigert.",
      serverError: "Serverfehler. Bitte versuchen Sie es später erneut.",
      validationError: "Bitte überprüfen Sie das Formular auf Fehler."
    },
    pagination: {
      page: "Seite",
      of: "von",
      showing: "Zeigt",
      to: "bis",
      items: "Einträge",
      perPage: "Pro Seite",
      previous: "Vorherige",
      next: "Nächste",
      first: "Erste",
      last: "Letzte"
    },
    language: {
      select: "Sprache auswählen",
      current: "Aktuelle Sprache",
      change: "Sprache ändern"
    }
  },
  dashboard: {
    title: "Übersicht & Compliance-Status",
    subtitle: "Echtzeit-Überblick über Sicherheitslage, Kontrollen und Risiken",
    score: "Compliance-Gesamtbewertung",
    implementedControls: "Umgesetzte Kontrollen",
    activeRisks: "Aktive Risiken",
    pendingEvidence: "Ausstehende Nachweise",
    upcomingAudits: "Anstehende Audits",
    recentActivity: "Letzte Aktivitäten",
    frameworks: "Regelwerke & Frameworks",
    tasksDue: "Fällige Aufgaben",
    quickActions: "Schnellzugriff"
  },
  compliance: {
    title: "Compliance & Kontrollrahmen",
    controls: "Sicherheitskontrollen",
    frameworks: "Regelwerke (ISO 27001, NIS2, DSGVO, SOC 2)",
    status: {
      implemented: "Vollständig umgesetzt",
      partiallyImplemented: "Teilweise umgesetzt",
      notImplemented: "Nicht umgesetzt",
      notApplicable: "Nicht anwendbar"
    },
    filterByFramework: "Nach Regelwerk filtern",
    searchControls: "Kontrollen durchsuchen...",
    addControl: "Kontrolle hinzufügen"
  },
  risk: {
    title: "Unternehmens-Risikomanagement",
    register: "Risikoregister",
    matrix: "5x5 Risikomatrix",
    fairModel: "FAIR Quantitative Verlustanalyse",
    inherentRisk: "Inhärentes Risiko",
    residualRisk: "Restrisiko",
    ale: "Jährliche Schadenserwartung (ALE)",
    var90: "90% Value-at-Risk (VaR)",
    treatment: {
      treat: "Behandeln / Reduzieren",
      tolerate: "Akzeptieren / Tolerieren",
      transfer: "Transferieren (Versicherung)",
      terminate: "Beenden / Vermeiden"
    },
    addRisk: "Neues Risiko erfassen"
  },
  policy: {
    title: "Richtlinien & Dokumenten-Lebenszyklus",
    drafts: "Entwürfe",
    approved: "Freigegeben & Gültig",
    inReview: "In Überprüfung",
    archive: "Archiviert",
    generateAi: "Richtlinie mit KI (Tara) entwerfen",
    version: "Version",
    owner: "Dokumenteneigentümer",
    acknowledgment: "Mitarbeiter-Bestätigung"
  },
  vendors: {
    title: "Lieferanten- & Drittparteien-Risiko (TPRM)",
    directory: "Lieferantenverzeichnis",
    criticality: "Kritikalität (Hoch, Mittel, Niedrig)",
    contractValue: "Vertragswert & Jahresbudget",
    dpaStatus: "AVV / DPA Status",
    soc2Status: "SOC 2 / ISO 27001 Nachweis",
    addVendor: "Lieferanten hinzufügen"
  },
  evidence: {
    title: "Nachweis- & Audit-Repository",
    upload: "Nachweis hochladen",
    verified: "Vom Auditor bestätigt",
    pendingReview: "Prüfung ausstehend",
    validUntil: "Gültig bis",
    linkedControls: "Verknüpfte Kontrollen"
  },
  settings: {
    title: "Einstellungen",
    overview: "Übersicht der Einstellungen",
    general: "Allgemeine Einstellungen",
    regional: "Regional- & Währungseinstellungen",
    currency: "Hauptwährung",
    locale: "Zahlen- & Datumsformat",
    language: "Sprache",
    security: "Sicherheit & MFA",
    billing: "Abrechnung & Lizenz",
    integrations: "Integrationen & APIs"
  },
  employees: {
    title: "Mitarbeiter & Berechtigungen",
    directory: "Mitarbeiterverzeichnis",
    role: "Rolle & Zugriff",
    trainingStatus: "Schulungsstatus",
    addEmployee: "Mitarbeiter hinzufügen"
  },
  training: {
    title: "Sicherheitsschulungen & Awareness",
    courses: "Verfügbare Schulungen",
    completionRate: "Abschlussquote",
    assignedTo: "Zugewiesen an",
    dueDate: "Fälligkeitsdatum"
  }
};

// 🇫🇷 FRENCH (FR) TRANSLATIONS - Statutory GRC & Enterprise Standard
const fr = {
  navigation: {
    home: "Accueil",
    dashboard: "Tableau de bord",
    compliance: "Conformité",
    requirements: "Exigences",
    controls: "Contrôles",
    policies: "Politiques",
    evidence: "Preuves & Audits",
    risks: "Gestion des Risques",
    threats: "Menaces",
    vulnerabilities: "Vulnérabilités",
    vendors: "Fournisseurs & Tiers",
    assets: "Actifs & Systèmes",
    employees: "Collaborateurs",
    training: "Formations",
    learning: "Sensibilisation",
    audit: "Audits & Évaluations",
    reports: "Rapports",
    settings: "Paramètres",
    profile: "Profil",
    logout: "Se déconnecter",
    login: "Se connecter",
    register: "S'inscrire",
    menu: "Menu",
    close: "Fermer",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    skipToContent: "Passer au contenu principal",
    breadcrumb: {
      home: "Accueil",
      dashboard: "Tableau de bord"
    }
  },
  common: {
    app: {
      name: "ComplianceOS",
      tagline: "Plateforme de Gouvernance, Gestion des Risques & Conformité"
    },
    common: {
      save: "Enregistrer",
      cancel: "Annuler",
      delete: "Supprimer",
      edit: "Modifier",
      create: "Créer",
      update: "Mettre à jour",
      search: "Rechercher",
      filter: "Filtrer",
      export: "Exporter",
      import: "Importer",
      loading: "Chargement en cours...",
      noData: "Aucune donnée disponible",
      error: "Erreur",
      success: "Succès",
      warning: "Avertissement",
      info: "Information",
      confirm: "Confirmer",
      close: "Fermer",
      back: "Retour",
      next: "Suivant",
      previous: "Précédent",
      submit: "Soumettre",
      reset: "Réinitialiser",
      yes: "Oui",
      no: "Non",
      all: "Tous",
      none: "Aucun",
      select: "Sélectionner",
      selectOption: "Sélectionnez une option",
      required: "Requis",
      optional: "Optionnel",
      enabled: "Activé",
      disabled: "Désactivé",
      active: "Actif",
      inactive: "Inactif",
      pending: "En attente",
      completed: "Terminé",
      inProgress: "En cours",
      notStarted: "Non commencé",
      seeAll: "Voir tout",
      viewDetails: "Voir les détails",
      viewMore: "Voir plus",
      less: "Moins",
      more: "Plus",
      actions: "Actions",
      status: "Statut",
      date: "Date",
      time: "Heure",
      name: "Nom",
      description: "Description",
      type: "Type",
      category: "Catégorie",
      notes: "Notes",
      comments: "Commentaires",
      attachments: "Pièces jointes",
      createdAt: "Créé le",
      updatedAt: "Mis à jour le",
      createdBy: "Créé par",
      modifiedBy: "Modifié par"
    },
    validation: {
      required: "Ce champ est obligatoire",
      invalidEmail: "Veuillez saisir une adresse e-mail valide",
      minLength: "Doit contenir au moins {{min}} caractères",
      maxLength: "Ne doit pas dépasser {{max}} caractères",
      invalidNumber: "Veuillez saisir un nombre valide",
      invalidDate: "Veuillez saisir une date valide",
      invalidUrl: "Veuillez saisir une URL valide"
    },
    errors: {
      generic: "Une erreur est survenue. Veuillez réessayer.",
      networkError: "Erreur réseau. Veuillez vérifier votre connexion.",
      notFound: "La ressource demandée est introuvable.",
      unauthorized: "Vous n'êtes pas autorisé à effectuer cette action.",
      forbidden: "Accès refusé.",
      serverError: "Erreur serveur. Veuillez réessayer plus tard.",
      validationError: "Veuillez vérifier les erreurs dans le formulaire."
    },
    pagination: {
      page: "Page",
      of: "sur",
      showing: "Affichage de",
      to: "à",
      items: "éléments",
      perPage: "Par page",
      previous: "Précédent",
      next: "Suivant",
      first: "Premier",
      last: "Dernier"
    },
    language: {
      select: "Choisir la langue",
      current: "Langue actuelle",
      change: "Changer de langue"
    }
  },
  dashboard: {
    title: "Tableau de Bord & Posture de Conformité",
    subtitle: "Vue d'ensemble en temps réel de votre sécurité, contrôles et risques",
    score: "Score Global de Conformité",
    implementedControls: "Contrôles Implémentés",
    activeRisks: "Risques Actifs",
    pendingEvidence: "Preuves en Attente",
    upcomingAudits: "Audits à Venir",
    recentActivity: "Activités Récentes",
    frameworks: "Référentiels & Cadres",
    tasksDue: "Tâches Échues",
    quickActions: "Actions Rapides"
  },
  compliance: {
    title: "Cadres de Conformité & Contrôles",
    controls: "Contrôles de Sécurité",
    frameworks: "Référentiels (ISO 27001, NIS2, RGPD, SOC 2)",
    status: {
      implemented: "Entièrement implémenté",
      partiallyImplemented: "Partiellement implémenté",
      notImplemented: "Non implémenté",
      notApplicable: "Non applicable"
    },
    filterByFramework: "Filtrer par référentiel",
    searchControls: "Rechercher des contrôles...",
    addControl: "Ajouter un contrôle"
  },
  risk: {
    title: "Gestion des Risques d'Entreprise",
    register: "Registre des Risques",
    matrix: "Matrice de Risques 5x5",
    fairModel: "Modélisation Quantitative FAIR",
    inherentRisk: "Risque Inhérent",
    residualRisk: "Risque Résiduel",
    ale: "Espérance de Perte Annuelle (ALE)",
    var90: "Value-at-Risk 90% (VaR)",
    treatment: {
      treat: "Traiter / Réduire",
      tolerate: "Tolérer / Accepter",
      transfer: "Transférer (Assurance)",
      terminate: "Éviter / Supprimer"
    },
    addRisk: "Déclarer un nouveau risque"
  },
  policy: {
    title: "Politiques & Gouvernance Documentaire",
    drafts: "Brouillons",
    approved: "Approuvées & En vigueur",
    inReview: "En révision",
    archive: "Archivées",
    generateAi: "Rédiger une politique avec l'IA (Tara)",
    version: "Version",
    owner: "Propriétaire du document",
    acknowledgment: "Accusé de réception collaborateur"
  },
  vendors: {
    title: "Gestion des Risques Tiers & Fournisseurs (TPRM)",
    directory: "Annuaire des Fournisseurs",
    criticality: "Niveau de Criticité (Élevé, Moyen, Faible)",
    contractValue: "Valeur du Contrat & Budget",
    dpaStatus: "Statut DPA / Sous-traitance",
    soc2Status: "Rapport SOC 2 / Certificat ISO 27001",
    addVendor: "Ajouter un fournisseur"
  },
  evidence: {
    title: "Dépôt des Preuves d'Audit",
    upload: "Téléverser une preuve",
    verified: "Vérifié par l'auditeur",
    pendingReview: "En attente de revue",
    validUntil: "Valable jusqu'au",
    linkedControls: "Contrôles associés"
  },
  settings: {
    title: "Paramètres",
    overview: "Vue d'ensemble des paramètres",
    general: "Paramètres Généraux",
    regional: "Paramètres Régionaux & Devise",
    currency: "Devise Principale",
    locale: "Format Numérique & Date",
    language: "Langue de l'interface",
    security: "Sécurité & MFA",
    billing: "Facturation & Licences",
    integrations: "Intégrations & API"
  },
  employees: {
    title: "Collaborateurs & Accès",
    directory: "Annuaire des Collaborateurs",
    role: "Rôle & Habilitations",
    trainingStatus: "Statut de Formation",
    addEmployee: "Ajouter un collaborateur"
  },
  training: {
    title: "Formations & Sensibilisation à la Sécurité",
    courses: "Modules Disponibles",
    completionRate: "Taux de Réussite",
    assignedTo: "Assigné à",
    dueDate: "Date d'échéance"
  }
};

// 🇳🇱 DUTCH (NL) TRANSLATIONS - Statutory GRC & Enterprise Standard
const nl = {
  navigation: {
    home: "Startpagina",
    dashboard: "Dashboard",
    compliance: "Compliance",
    requirements: "Vereisten",
    controls: "Beheersmaatregelen",
    policies: "Beleid",
    evidence: "Bewijsmateriaal",
    risks: "Risicobeheer",
    threats: "Dreigingen",
    vulnerabilities: "Kwetsbaarheden",
    vendors: "Leveranciers & Derden",
    assets: "Activa & Systemen",
    employees: "Medewerkers",
    training: "Training & Bewustwording",
    learning: "Opleidingen",
    audit: "Audits & Toetsingen",
    reports: "Rapporten",
    settings: "Instellingen",
    profile: "Profiel",
    logout: "Uitloggen",
    login: "Inloggen",
    register: "Registreren",
    menu: "Menu",
    close: "Sluiten",
    back: "Terug",
    next: "Volgende",
    previous: "Vorige",
    skipToContent: "Naar hoofdinhoud",
    breadcrumb: {
      home: "Startpagina",
      dashboard: "Dashboard"
    }
  },
  common: {
    app: {
      name: "ComplianceOS",
      tagline: "Platform voor Governance, Risicobeheer & Compliance"
    },
    common: {
      save: "Opslaan",
      cancel: "Annuleren",
      delete: "Verwijderen",
      edit: "Bewerken",
      create: "Aanmaken",
      update: "Bijwerken",
      search: "Zoeken",
      filter: "Filteren",
      export: "Exporteren",
      import: "Importeren",
      loading: "Laden...",
      noData: "Geen gegevens beschikbaar",
      error: "Fout",
      success: "Succes",
      warning: "Waarschuwing",
      info: "Informatie",
      confirm: "Bevestigen",
      close: "Sluiten",
      back: "Terug",
      next: "Volgende",
      previous: "Vorige",
      submit: "Versturen",
      reset: "Herstellen",
      yes: "Ja",
      no: "Nee",
      all: "Alle",
      none: "Geen",
      select: "Selecteren",
      selectOption: "Kies een optie",
      required: "Verplicht",
      optional: "Optioneel",
      enabled: "Ingeschakeld",
      disabled: "Uitgeschakeld",
      active: "Actief",
      inactive: "Inactief",
      pending: "In behandeling",
      completed: "Voltooid",
      inProgress: "In uitvoering",
      notStarted: "Niet gestart",
      seeAll: "Alles weergeven",
      viewDetails: "Details bekijken",
      viewMore: "Meer bekijken",
      less: "Minder",
      more: "Meer",
      actions: "Acties",
      status: "Status",
      date: "Datum",
      time: "Tijd",
      name: "Naam",
      description: "Beschrijving",
      type: "Type",
      category: "Categorie",
      notes: "Notities",
      comments: "Opmerkingen",
      attachments: "Bijlagen",
      createdAt: "Aangemaakt op",
      updatedAt: "Bijgewerkt op",
      createdBy: "Aangemaakt door",
      modifiedBy: "Gewijzigd door"
    },
    validation: {
      required: "Dit veld is verplicht",
      invalidEmail: "Voer een geldig e-mailadres in",
      minLength: "Moet minimaal {{min}} tekens bevatten",
      maxLength: "Mag maximaal {{max}} tekens bevatten",
      invalidNumber: "Voer een geldig getal in",
      invalidDate: "Voer een geldige datum in",
      invalidUrl: "Voer een geldige URL in"
    },
    errors: {
      generic: "Er is een fout opgetreden. Probeer het opnieuw.",
      networkError: "Netwerkfout. Controleer uw verbinding.",
      notFound: "De gevraagde bron is niet gevonden.",
      unauthorized: "U bent niet bevoegd om deze actie uit te voeren.",
      forbidden: "Toegang geweigerd.",
      serverError: "Serverfout. Probeer het later opnieuw.",
      validationError: "Controleer het formulier op fouten."
    },
    pagination: {
      page: "Pagina",
      of: "van",
      showing: "Weergave van",
      to: "tot",
      items: "items",
      perPage: "Per pagina",
      previous: "Vorige",
      next: "Volgende",
      first: "Eerste",
      last: "Laatste"
    },
    language: {
      select: "Taal selecteren",
      current: "Huidige taal",
      change: "Taal wijzigen"
    }
  },
  dashboard: {
    title: "Overzicht & Compliance Status",
    subtitle: "Realtime inzicht in beveiliging, beheersmaatregelen en risico's",
    score: "Totale Compliance Score",
    implementedControls: "Geïmplementeerde Maatregelen",
    activeRisks: "Actieve Risico's",
    pendingEvidence: "Openstaand Bewijsmateriaal",
    upcomingAudits: "Aankomende Audits",
    recentActivity: "Recente Activiteiten",
    frameworks: "Kaders & Normen (ISO 27001, NIS2, AVG)",
    tasksDue: "Vervallende Taken",
    quickActions: "Snelle Acties"
  },
  compliance: {
    title: "Compliance Kaders & Maatregelen",
    controls: "Beveiligingsmaatregelen",
    frameworks: "Normenkaders (ISO 27001, NIS2, AVG/GDPR, SOC 2)",
    status: {
      implemented: "Volledig geïmplementeerd",
      partiallyImplemented: "Gedeeltelijk geïmplementeerd",
      notImplemented: "Niet geïmplementeerd",
      notApplicable: "Niet van toepassing"
    },
    filterByFramework: "Filteren op normenkader",
    searchControls: "Zoek maatregelen...",
    addControl: "Maatregel toevoegen"
  },
  risk: {
    title: "Operationeel & Informatiebeveiligingsrisicobeheer",
    register: "Risicoregister",
    matrix: "5x5 Risicomatrix",
    fairModel: "FAIR Kwantitatieve Risicoanalyse",
    inherentRisk: "Inherent Risico",
    residualRisk: "Restrisico",
    ale: "Verwacht Jaarlijks Verlies (ALE)",
    var90: "90% Value-at-Risk (VaR)",
    treatment: {
      treat: "Behandelen / Beperken",
      tolerate: "Accepteren / Tolererend",
      transfer: "Overdragen (Verzekering)",
      terminate: "Vermijden / Beëindigen"
    },
    addRisk: "Nieuw risico toevoegen"
  },
  policy: {
    title: "Beleidsdocumenten & Governance",
    drafts: "Concepten",
    approved: "Goedgekeurd & Actief",
    inReview: "In beoordeling",
    archive: "Gearchiveerd",
    generateAi: "Beleid opstellen met AI (Tara)",
    version: "Versie",
    owner: "Documenteigenaar",
    acknowledgment: "Medewerkersakkoord"
  },
  vendors: {
    title: "Leveranciersrisicobeheer (TPRM)",
    directory: "Leveranciersoverzicht",
    criticality: "Kritikaliteit (Hoog, Gemiddeld, Laag)",
    contractValue: "Contractwaarde & Jaarbudget",
    dpaStatus: "Verwerkersovereenkomst (VOK) Status",
    soc2Status: "SOC 2 / ISO 27001 Certificaat",
    addVendor: "Leverancier toevoegen"
  },
  evidence: {
    title: "Audit Bewijsarchief",
    upload: "Bewijsstuk uploaden",
    verified: "Geverifieerd door auditor",
    pendingReview: "Wacht op beoordeling",
    validUntil: "Geldig tot",
    linkedControls: "Gekoppelde maatregelen"
  },
  settings: {
    title: "Instellingen",
    overview: "Overzicht instellingen",
    general: "Algemene Instellingen",
    regional: "Regio- & Valutainstellingen",
    currency: "Standaard Valuta",
    locale: "Getal- & Datumnotatie",
    language: "Interfacetaal",
    security: "Beveiliging & MFA",
    billing: "Facturatie & Licenties",
    integrations: "Koppelingen & API's"
  },
  employees: {
    title: "Medewerkers & Autorisaties",
    directory: "Medewerkersoverzicht",
    role: "Rol & Rechten",
    trainingStatus: "Trainingsstatus",
    addEmployee: "Medewerker toevoegen"
  },
  training: {
    title: "Security Awareness & Trainingen",
    courses: "Beschikbare Modules",
    completionRate: "Voltooiingspercentage",
    assignedTo: "Toegewezen aan",
    dueDate: "Vervaldatum"
  }
};

// 🇪🇸 SPANISH (ES) TRANSLATIONS
const es = {
  navigation: {
    home: "Inicio",
    dashboard: "Panel de Control",
    compliance: "Cumplimiento",
    requirements: "Requisitos",
    controls: "Controles",
    policies: "Políticas",
    evidence: "Evidencias",
    risks: "Gestión de Riesgos",
    threats: "Amenazas",
    vulnerabilities: "Vulnerabilidades",
    vendors: "Proveedores y Terceros",
    assets: "Activos y Sistemas",
    employees: "Empleados",
    training: "Capacitación",
    learning: "Formación",
    audit: "Auditorías",
    reports: "Informes",
    settings: "Configuración",
    profile: "Perfil",
    logout: "Cerrar sesión",
    login: "Iniciar sesión",
    register: "Registrarse",
    menu: "Menú",
    close: "Cerrar",
    back: "Atrás",
    next: "Siguiente",
    previous: "Anterior",
    skipToContent: "Saltar al contenido principal",
    breadcrumb: {
      home: "Inicio",
      dashboard: "Panel de Control"
    }
  },
  common: {
    app: {
      name: "ComplianceOS",
      tagline: "Plataforma de Gobernanza, Gestión de Riesgos y Cumplimiento"
    },
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      create: "Crear",
      update: "Actualizar",
      search: "Buscar",
      filter: "Filtrar",
      export: "Exportar",
      import: "Importar",
      loading: "Cargando...",
      noData: "No hay datos disponibles",
      error: "Error",
      success: "Éxito",
      warning: "Advertencia",
      info: "Información",
      confirm: "Confirmar",
      close: "Cerrar",
      back: "Atrás",
      next: "Siguiente",
      previous: "Anterior",
      submit: "Enviar",
      reset: "Restablecer",
      yes: "Sí",
      no: "No",
      all: "Todos",
      none: "Ninguno",
      select: "Seleccionar",
      selectOption: "Seleccione una opción",
      required: "Requerido",
      optional: "Opcional",
      enabled: "Habilitado",
      disabled: "Deshabilitado",
      active: "Activo",
      inactive: "Inactivo",
      pending: "Pendiente",
      completed: "Completado",
      inProgress: "En progreso",
      notStarted: "No iniciado",
      seeAll: "Ver todos",
      viewDetails: "Ver detalles",
      viewMore: "Ver más",
      less: "Menos",
      more: "Más",
      actions: "Acciones",
      status: "Estado",
      date: "Fecha",
      time: "Hora",
      name: "Nombre",
      description: "Descripción",
      type: "Tipo",
      category: "Categoría",
      notes: "Notas",
      comments: "Comentarios",
      attachments: "Archivos adjuntos",
      createdAt: "Creado",
      updatedAt: "Actualizado",
      createdBy: "Creado por",
      modifiedBy: "Modificado por"
    },
    validation: {
      required: "Este campo es obligatorio",
      invalidEmail: "Ingrese un correo electrónico válido",
      minLength: "Debe tener al menos {{min}} caracteres",
      maxLength: "No debe exceder {{max}} caracteres",
      invalidNumber: "Ingrese un número válido",
      invalidDate: "Ingrese una fecha válida",
      invalidUrl: "Ingrese una URL válida"
    },
    errors: {
      generic: "Ha ocurrido un error. Inténtelo de nuevo.",
      networkError: "Error de red. Verifique su conexión.",
      notFound: "El recurso solicitado no fue encontrado.",
      unauthorized: "No está autorizado para realizar esta acción.",
      forbidden: "Acceso denegado.",
      serverError: "Error del servidor. Inténtelo más tarde.",
      validationError: "Revise los errores en el formulario."
    },
    pagination: {
      page: "Página",
      of: "de",
      showing: "Mostrando",
      to: "a",
      items: "elementos",
      perPage: "Por página",
      previous: "Anterior",
      next: "Siguiente",
      first: "Primero",
      last: "Último"
    },
    language: {
      select: "Seleccionar idioma",
      current: "Idioma actual",
      change: "Cambiar idioma"
    }
  },
  dashboard: {
    title: "Panel de Estado y Cumplimiento",
    subtitle: "Visión general en tiempo real de seguridad, controles y riesgos",
    score: "Puntuación Global de Cumplimiento",
    implementedControls: "Controles Implementados",
    activeRisks: "Riesgos Activos",
    pendingEvidence: "Evidencias Pendientes",
    upcomingAudits: "Próximas Auditorías",
    recentActivity: "Actividad Reciente",
    frameworks: "Marcos Normativos (ISO 27001, NIS2, RGPD)",
    tasksDue: "Tareas Vencidas",
    quickActions: "Acciones Rápidas"
  },
  compliance: {
    title: "Marcos de Cumplimiento y Controles",
    controls: "Controles de Seguridad",
    frameworks: "Marcos Normativos (ISO 27001, NIS2, RGPD, SOC 2)",
    status: {
      implemented: "Completamente implementado",
      partiallyImplemented: "Parcialmente implementado",
      notImplemented: "No implementado",
      notApplicable: "No aplicable"
    },
    filterByFramework: "Filtrar por marco normativo",
    searchControls: "Buscar controles...",
    addControl: "Agregar control"
  },
  risk: {
    title: "Gestión de Riesgos Empresariales",
    register: "Registro de Riesgos",
    matrix: "Matriz de Riesgos 5x5",
    fairModel: "Análisis Cuantitativo FAIR",
    inherentRisk: "Riesgo Inherente",
    residualRisk: "Riesgo Residual",
    ale: "Expectativa de Pérdida Anual (ALE)",
    var90: "Valor en Riesgo 90% (VaR)",
    treatment: {
      treat: "Tratar / Mitigar",
      tolerate: "Tolerar / Aceptar",
      transfer: "Transferir (Seguro)",
      terminate: "Evitar / Eliminar"
    },
    addRisk: "Registrar nuevo riesgo"
  },
  policy: {
    title: "Políticas y Gobierno Documental",
    drafts: "Borradores",
    approved: "Aprobadas y Vigentes",
    inReview: "En revisión",
    archive: "Archivadas",
    generateAi: "Redactar política con IA (Tara)",
    version: "Versión",
    owner: "Propietario del documento",
    acknowledgment: "Aceptación de empleados"
  },
  vendors: {
    title: "Gestión de Riesgo de Proveedores (TPRM)",
    directory: "Directorio de Proveedores",
    criticality: "Criticidad (Alta, Media, Baja)",
    contractValue: "Valor de Contrato y Presupuesto",
    dpaStatus: "Estado DPA / Encargado de Tratamiento",
    soc2Status: "Informe SOC 2 / Certificado ISO 27001",
    addVendor: "Agregar proveedor"
  },
  evidence: {
    title: "Repositorio de Evidencias de Auditoría",
    upload: "Subir evidencia",
    verified: "Verificado por auditor",
    pendingReview: "Revisión pendiente",
    validUntil: "Válido hasta",
    linkedControls: "Controles vinculados"
  },
  settings: {
    title: "Configuración",
    overview: "Resumen de configuración",
    general: "Configuración General",
    regional: "Configuración Regional y Moneda",
    currency: "Moneda Principal",
    locale: "Formato Numérico y Fecha",
    language: "Idioma de la Interfaz",
    security: "Seguridad y MFA",
    billing: "Facturación y Licencias",
    integrations: "Integraciones y API"
  },
  employees: {
    title: "Empleados y Accesos",
    directory: "Directorio de Empleados",
    role: "Rol y Permisos",
    trainingStatus: "Estado de Capacitación",
    addEmployee: "Agregar empleado"
  },
  training: {
    title: "Capacitación y Concienciación en Seguridad",
    courses: "Cursos Disponibles",
    completionRate: "Tasa de Finalización",
    assignedTo: "Asignado a",
    dueDate: "Fecha límite"
  }
};

const languages = { de, fr, nl, es };

for (const [lang, namespaces] of Object.entries(languages)) {
  const langDir = path.join(LOCALES_DIR, lang);
  fs.mkdirSync(langDir, { recursive: true });

  for (const [ns, content] of Object.entries(namespaces)) {
    const filePath = path.join(langDir, `${ns}.json`);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 4) + "\n", "utf-8");
  }
  console.log(`✅ Successfully seeded complete GRC translation suite for '${lang.toUpperCase()}'!`);
}
