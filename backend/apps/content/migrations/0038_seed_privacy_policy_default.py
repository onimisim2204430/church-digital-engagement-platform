from django.db import migrations


DEFAULT_TITLE = 'Privacy Policy'
DEFAULT_CONTENT = (
    '<h2>Overview</h2>\n'
    '<p>This Privacy Policy explains how we collect, use, store, and protect personal information across our church website, member experiences, and digital ministry tools.</p>\n'
    '<p>By using this platform, you agree to the practices described below.</p>\n'
    '<h2>Information We Collect</h2>\n'
    '<p>Depending on how you interact with us, we may collect:</p>\n'
    '<ul>\n'
    '  <li><strong>Identity and contact details</strong> such as your name, email address, and phone number.</li>\n'
    '  <li><strong>Account data</strong> such as login activity, profile information, and communication preferences.</li>\n'
    '  <li><strong>Engagement data</strong> such as event registrations, prayer submissions, and community interactions.</li>\n'
    '  <li><strong>Giving data</strong> related to donations and payment references (processed by secure payment providers).</li>\n'
    '</ul>\n'
    '<h2>How We Use Information</h2>\n'
    '<p>We use collected data to:</p>\n'
    '<ul>\n'
    '  <li>Provide church services and ministry communication.</li>\n'
    '  <li>Manage user accounts and secure access.</li>\n'
    '  <li>Coordinate events, discipleship programs, and community support.</li>\n'
    '  <li>Improve platform reliability, safety, and user experience.</li>\n'
    '  <li>Comply with legal and financial obligations.</li>\n'
    '</ul>\n'
    '<h2>Legal Basis and Consent</h2>\n'
    '<p>Where required by law, we process data based on consent, legitimate ministry interest, contractual necessity, or legal obligation. You may withdraw consent for optional communications at any time.</p>\n'
    '<h2>Data Sharing</h2>\n'
    '<p>We do not sell personal information. We may share limited data with trusted service providers that help us operate core services (for example email delivery, analytics, or payment processing), under appropriate confidentiality and security controls.</p>\n'
    '<h2>Data Retention</h2>\n'
    '<p>We retain personal data only as long as reasonably necessary for ministry purposes, account support, reporting requirements, and legal compliance. Data that is no longer needed is removed or anonymized where practical.</p>\n'
    '<h2>Security</h2>\n'
    '<p>We apply technical and administrative safeguards to protect personal information from unauthorized access, loss, misuse, or disclosure. No internet-based service is 100% secure, but we continually improve protections.</p>\n'
    '<h2>Your Rights</h2>\n'
    '<p>Subject to applicable law, you may have rights to access, correct, delete, or restrict the use of your personal data. You may also request information about data we hold about you.</p>\n'
    '<h2>Children and Family Data</h2>\n'
    '<p>Some ministry activities involve minors. We encourage parents and guardians to supervise children\'s digital participation and contact us for any privacy concerns related to family or youth information.</p>\n'
    '<h2>Policy Updates</h2>\n'
    '<p>We may update this Privacy Policy from time to time. The "Last updated" date indicates the latest revision. Continued use of the platform after changes means you accept the updated policy.</p>\n'
    '<h2>Contact</h2>\n'
    '<p>If you have questions, requests, or concerns regarding privacy, please contact the church administration team through the official church contact channels.</p>'
)


def seed_privacy_policy(apps, schema_editor):
    PrivacyPolicy = apps.get_model('content', 'PrivacyPolicy')

    PrivacyPolicy.objects.get_or_create(
        pk=1,
        defaults={
            'title': DEFAULT_TITLE,
            'content': DEFAULT_CONTENT,
            'is_published': True,
            'updated_by': 'system-seed',
        },
    )


def unseed_privacy_policy(apps, schema_editor):
    PrivacyPolicy = apps.get_model('content', 'PrivacyPolicy')
    PrivacyPolicy.objects.filter(pk=1, updated_by='system-seed').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0037_privacypolicy'),
    ]

    operations = [
        migrations.RunPython(seed_privacy_policy, unseed_privacy_policy),
    ]
