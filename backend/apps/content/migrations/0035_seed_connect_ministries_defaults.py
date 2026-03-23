from django.db import migrations


def seed_connect_ministries(apps, schema_editor):
    ConnectMinistry = apps.get_model('content', 'ConnectMinistry')

    defaults = [
        {
            'title': 'Young Adults Collective',
            'slug': 'young-adults-collective',
            'description': 'A space for 18-30s to navigate life, faith, and culture together over good coffee and honest conversation.',
            'card_type': 'group',
            'style_variant': 'featured_group',
            'category_label': 'Community',
            'schedule_label': 'Tuesdays @ 7:00 PM',
            'location_label': 'The Loft',
            'date_label': '',
            'icon_name': '',
            'image_url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwM_l2I-Ip3GJ_uZcX7n04Mb_VChe5MfUvShjPaRrT3LoU5ZRTCGrZtIdrzs6Rrn6IUktTnFJXX9ARovS2SImDgzkM6_XOEShw-k3LvmW-H63fzMeqt5UTAakI-USKypxvlR37fL7mL3np2XuAH2qzI0v3fZQ0C2JSau5fM1yIzP5yf32IOvumyXpUJ--JZBEaigyTPLAWrqja3cQ4JuM-2yFp2E51jLJyqkql3e6g__oOYhYkvF_AlgZHQQpSvx-xcxcHALZHniw',
            'cta_label': 'Learn More',
            'cta_url': '',
            'is_active': True,
            'display_order': 1,
            'updated_by': 'system-seed',
        },
        {
            'title': 'Hospitality',
            'slug': 'hospitality',
            'description': 'Create a welcoming atmosphere. Prepare coffee, greet guests, and make everyone feel at home.',
            'card_type': 'serve',
            'style_variant': 'sand_serve',
            'category_label': 'Serve Team',
            'schedule_label': '',
            'location_label': '',
            'date_label': '',
            'icon_name': 'coffee',
            'image_url': '',
            'cta_label': 'Join the Team',
            'cta_url': '',
            'is_active': True,
            'display_order': 2,
            'updated_by': 'system-seed',
        },
        {
            'title': 'Morning Prayer',
            'slug': 'morning-prayer',
            'description': 'Start your day with intention and community prayer.',
            'card_type': 'group',
            'style_variant': 'standard_group',
            'category_label': 'Study',
            'schedule_label': 'Daily (M-F)',
            'location_label': '6:00 AM - Online',
            'date_label': '',
            'icon_name': '',
            'image_url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5T-mSOba17GjhZf2vlYJT_zR803GswV4IG9KQAZqZgfr-5hk9pr0_IOZtL8-XnISfdyvLR980bSKhH3mSmyA2ClC8DQpu2tQ7ZDAEfSuclZgYVmrue2q4KZuNGEdI1cjl-sT3ttIrJnPadaUlYeFXD3Xw_qPj2Ohg9xeSjn-_l3fr-x0Dpg0jCn1aqAnygeLGLgnHYNwA5xhabpo-1XzWZmnlcNxrrjH3vxjYHXmLXd4shR0S8kOYGsFAb1_iuxfSef5gS2horX8',
            'cta_label': 'Learn More',
            'cta_url': '',
            'is_active': True,
            'display_order': 3,
            'updated_by': 'system-seed',
        },
        {
            'title': 'Kids Ministry',
            'slug': 'kids-ministry',
            'description': 'Invest in the next generation. We need storytellers, nursery helpers, and check-in assistants.',
            'card_type': 'serve',
            'style_variant': 'outlined_serve',
            'category_label': 'Serve',
            'schedule_label': '',
            'location_label': '',
            'date_label': '',
            'icon_name': 'volunteer_activism',
            'image_url': '',
            'cta_label': 'Get Involved',
            'cta_url': '',
            'is_active': True,
            'display_order': 4,
            'updated_by': 'system-seed',
        },
        {
            'title': 'Alpha Course',
            'slug': 'alpha-course',
            'description': 'Explore the basics of the Christian faith in an open, friendly environment.',
            'card_type': 'group',
            'style_variant': 'standard_group',
            'category_label': 'Course',
            'schedule_label': 'Wednesdays',
            'location_label': '6:30 PM - Main Hall',
            'date_label': '',
            'icon_name': '',
            'image_url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKbG-C0nqrbSLJjlqgxgxU4tcHxCb-rxivo4aZQHshwvRvf3GzgNOqgAFNpiR0Do36gAka02ioWaCfBl8cKTJPPRILncXyfVH5clX4rdsfrN0UxoZ8wXHx0bQ37i_bDgsLXqMxJ8WdsT4qj5ML0b-yfXZhv7fPgzsOnYQVrVpN-LzymXKKWf5IRc5Lc9zREKL1d_AMJlyQ_kTcSssaFmhCBptdV0UwqdLbA8GGEhQIEXSux7i59EbGThmT6l4mAEJKfBsK2ysWgvM',
            'cta_label': 'Learn More',
            'cta_url': '',
            'is_active': True,
            'display_order': 5,
            'updated_by': 'system-seed',
        },
        {
            'title': 'Worship & Tech',
            'slug': 'worship-tech',
            'description': 'Musicians, audio engineers, and visual artists helping to create an atmosphere of worship.',
            'card_type': 'serve',
            'style_variant': 'sand_serve',
            'category_label': 'Serve Team',
            'schedule_label': '',
            'location_label': '',
            'date_label': '',
            'icon_name': 'music_note',
            'image_url': '',
            'cta_label': 'Audition / Join',
            'cta_url': '',
            'is_active': True,
            'display_order': 6,
            'updated_by': 'system-seed',
        },
        {
            'title': 'Community Feast',
            'slug': 'community-feast',
            'description': "A quarterly potluck for the entire congregation. Bring a dish, bring a friend, and let's share a meal together.",
            'card_type': 'event',
            'style_variant': 'featured_event',
            'category_label': 'Upcoming Event',
            'schedule_label': '',
            'location_label': '',
            'date_label': 'Oct 15th @ 5:00 PM',
            'icon_name': '',
            'image_url': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCL2Mnp3TDj7aKVqlT2-kdpx44wuams-r-dpQjjfF2KAxCdIun9ocUstawDqpQvhMApXWdSPat8yozQ-cYcMAcRz7ncy4t2mbWNtAFkbmwm1a5mQCW9-MWRGoAnpbCjsUA9JsZrVod5C0vbWYUNFTXzn7l5kX_xVbOzQRoYnMfeL1ki_OTmpe5I9fpOAz1djZVIyPrWOrNg2EdYlyVU7j4O-ZqqQrLQ3xA8AFOetbO8d1wLxeeiIBfB2ghLQ3akdwkvtqfviUP4pfQ',
            'cta_label': 'RSVP',
            'cta_url': '',
            'is_active': True,
            'display_order': 7,
            'updated_by': 'system-seed',
        },
    ]

    for item in defaults:
        ConnectMinistry.objects.update_or_create(
            slug=item['slug'],
            defaults=item,
        )


def unseed_connect_ministries(apps, schema_editor):
    ConnectMinistry = apps.get_model('content', 'ConnectMinistry')
    slugs = [
        'young-adults-collective',
        'hospitality',
        'morning-prayer',
        'kids-ministry',
        'alpha-course',
        'worship-tech',
        'community-feast',
    ]
    ConnectMinistry.objects.filter(slug__in=slugs, updated_by='system-seed').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0034_connectministry_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_connect_ministries, unseed_connect_ministries),
    ]
