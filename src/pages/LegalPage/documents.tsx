import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL_OPERATOR_NAME } from "@/lib/legal";
import { ContactLink } from "./ContactLink";

type LegalDocument = {
  title: string;
  introduction: string;
  sections: { id: string; title: string; content: ReactNode }[];
};

export const legalDocuments: Record<"privacy" | "terms", LegalDocument> = {
  privacy: {
    title: "Privacy policy",
    introduction: "This policy explains how Lighting VTT handles information when you create scenes, join a game, or share effects with the community.",
    sections: [
      {
        id: "who-we-are", title: "Who we are",
        content: <p>Lighting VTT is operated by {LEGAL_OPERATOR_NAME} ("we", "us"). We are responsible for the personal information processed to provide this service. For privacy questions or requests, contact <ContactLink />.</p>,
      },
      {
        id: "information", title: "Information we collect",
        content: <ul>
          <li><strong>Account information.</strong> Clerk manages sign-in and account details, including your email address, profile details, and authentication information. Lighting VTT uses your account identifier to associate your content with you.</li>
          <li><strong>Content you create.</strong> We store scenes, uploaded maps and token images, lighting settings, presets, effects and their code, and related metadata. Published effects may include your display name.</li>
          <li><strong>Game participation.</strong> We process player and character names, scene membership, token positions, initiative, online status, and saved scene bookmarks. Guest sessions use a session identifier so players can participate without an account.</li>
          <li><strong>Usage and technical information.</strong> We use PostHog to collect page views, feature interactions, and diagnostic events. Our service providers may also process IP addresses, browser and device details, identifiers, and operational logs.</li>
          <li><strong>Communications and reports.</strong> If you contact us or report an effect, we process the information you provide to respond and investigate.</li>
        </ul>,
      },
      {
        id: "purposes", title: "How we use information",
        content: <>
          <p>We use information to authenticate users, save and synchronize scenes, deliver uploaded files, support multiplayer sessions, publish effects you choose to share, respond to requests, prevent abuse, and understand and improve the service.</p>
          <p>Where applicable data protection law requires a legal basis, we rely on performing our agreement with you for core service features, legitimate interests for security and service improvement where those interests do not override your rights, legal obligations where required, and consent where required. You may withdraw consent by contacting us without affecting processing that already took place.</p>
        </>,
      },
      {
        id: "sharing", title: "Sharing and service providers",
        content: <>
          <p>We use Clerk for authentication, Convex for application data and backend processing, UploadThing for file uploads and delivery, PostHog for analytics, and Vercel for website hosting. These providers process information needed to deliver their services. The website also requests fonts from Google Fonts, which receives connection information such as your IP address.</p>
          <p>Scene information is shared with participants according to the game’s features. Public effects, their code, and author details are available to other users. Invite links and uploaded file URLs can be forwarded; avoid uploading confidential information or sharing links beyond your intended audience.</p>
          <p>We may disclose information when legally required or necessary to address abuse, enforce our terms, or protect people and the service. Providers may process information in countries outside your own, where privacy laws may differ. Contact us for information about the providers and transfer safeguards applicable to your data.</p>
        </>,
      },
      {
        id: "browser-storage", title: "Cookies and browser storage",
        content: <>
          <p>Clerk uses browser technologies to maintain authentication. Lighting VTT stores preferences, workshop drafts, and recent activity locally, and uses session storage for guest access and navigation state. PostHog may use cookies or local storage to recognize visits and measure usage.</p>
          <p>You can remove or restrict cookies and site storage in your browser settings. Doing so may sign you out, remove locally saved drafts and preferences, or interrupt guest access. Clearing browser storage does not delete content saved on our servers.</p>
        </>,
      },
      {
        id: "retention", title: "Retention and deletion",
        content: <>
          <p>We retain account and application data to provide saved content and ongoing access. Retention depends on the data’s purpose, whether your account or content remains in use, requests for deletion, security needs, and applicable legal obligations. Backups and provider logs may remain for their applicable retention periods.</p>
          <p>You can delete scenes and manage content using the available controls. To request deletion of your account and associated application data, contact <ContactLink />. Deleting your Clerk account alone does not automatically remove all scene data, uploads, or published effects. Copies already shared or remixed by other users may remain.</p>
        </>,
      },
      {
        id: "rights", title: "Your choices and rights",
        content: <p>Depending on your location, you may have rights to access, correct, delete, or receive a copy of your personal information, restrict or object to processing, and withdraw consent. Send requests to <ContactLink />; we may need to verify your identity. You may also complain to your local data protection authority. Avoid including passwords or sensitive game content in a request.</p>,
      },
      {
        id: "children", title: "Children’s privacy",
        content: <p>Lighting VTT is not directed to children under 13, or below the minimum age required in their location. If you believe a child has provided personal information without appropriate authorization, contact us so we can investigate and address it.</p>,
      },
      {
        id: "privacy-updates", title: "Updates and contact",
        content: <p>We may update this policy as the service changes. The date above identifies the latest version; we will provide additional notice of material changes where required by law. Questions about this policy can be sent to <ContactLink />. Use of the service is also covered by our <Link to="/terms">terms &amp; conditions</Link>.</p>,
      },
    ],
  },
  terms: {
    title: "Terms & conditions",
    introduction: "These terms govern your use of Lighting VTT, including scene creation, multiplayer games, uploads, and the community effects workshop.",
    sections: [
      {
        id: "agreement", title: "Your agreement",
        content: <p>Lighting VTT is provided by {LEGAL_OPERATOR_NAME} ("we", "us"). By using the service, you agree to these terms. If you do not agree, do not use the service. You must be at least 13, meet any higher minimum age required where you live, and have permission from a parent or guardian if you cannot legally enter this agreement yourself.</p>,
      },
      {
        id: "accounts", title: "Accounts and game access",
        content: <p>You are responsible for your account, keeping sign-in credentials secure, and the content and activity you control. Clerk provides account authentication. Guests may join using an invitation without creating an account. Share invitations only with people you intend to admit, and contact us if you believe your account or a game session has been compromised.</p>,
      },
      {
        id: "your-content", title: "Your content and permissions",
        content: <>
          <p>You retain ownership of the maps, images, scenes, code, and other content you submit. You must own that content or have permission to use it and share it as you do through the service. Do not upload personal information about others without appropriate authorization.</p>
          <p>You grant us a non-exclusive permission to store, process, reproduce, and display your content as needed to operate the features you use, including file delivery, scene sharing, and effect previews. This permission does not transfer ownership to us.</p>
          <p>If you publish an effect, you allow other users to view, use, and remix it through Lighting VTT. Unpublishing stops future discovery but may not remove copies, remixes, or versions already used in other users’ scenes. Keep your own copies of important content.</p>
        </>,
      },
      {
        id: "acceptable-use", title: "Acceptable use",
        content: <ul>
          <li>Do not upload or share unlawful content, violate intellectual property or privacy rights, or harass or exploit others.</li>
          <li>Do not submit malicious code, attempt unauthorized access, bypass access controls, or disrupt the service or other users’ devices.</li>
          <li>Do not misuse uploads, automate abusive requests, or evade service limits or moderation decisions.</li>
          <li>Use community effects and shared assets only in ways permitted by their owners and these terms.</li>
        </ul>,
      },
      {
        id: "community", title: "Community content and moderation",
        content: <p>Community effects and uploaded assets come from users. We do not guarantee their quality, accuracy, suitability, or compatibility with your device. We may review reports, restrict access, or remove content that violates these terms, creates security risks, or must be removed by law. Report an effect using the available reporting feature, or send concerns and copyright complaints to <ContactLink /> with enough detail to identify the content and issue.</p>,
      },
      {
        id: "availability", title: "Availability and changes",
        content: <p>The service may change, experience interruptions, or be discontinued. We do not promise uninterrupted access, permanent storage, or compatibility with every browser or device. Where reasonably possible, we will give notice of material changes that affect access to your content. Third-party services and websites may have their own terms.</p>,
      },
      {
        id: "liability", title: "Disclaimers and responsibility",
        content: <>
          <p>To the extent permitted by applicable law, Lighting VTT is provided "as is" and "as available", without warranties of merchantability, fitness for a particular purpose, or non-infringement. You are responsible for choosing content appropriate for your group and maintaining backups.</p>
          <p>To the extent permitted by law, we are not liable for indirect or consequential losses, lost profits, or loss of data arising from use of the service. Nothing in these terms excludes liability that cannot lawfully be excluded, including liability for fraud, or limits mandatory consumer rights.</p>
        </>,
      },
      {
        id: "ending-use", title: "Ending use of the service",
        content: <p>You can stop using Lighting VTT at any time. We may suspend or end access for violations of these terms, security risks, or legal requirements. For account or associated data deletion, contact <ContactLink />. Content already shared with others may remain as described above and in our <Link to="/privacy">privacy policy</Link>.</p>,
      },
      {
        id: "terms-updates", title: "Updates and questions",
        content: <p>We may revise these terms as the service evolves. We will update the date above and provide notice or request renewed acceptance where required. If you disagree with updated terms, stop using the service. For questions or to raise a dispute, contact <ContactLink />. Applicable law and any mandatory rights in your location continue to apply.</p>,
      },
    ],
  },
};
