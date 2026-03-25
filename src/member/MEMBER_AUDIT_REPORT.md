# MEMBER AUDIT REPORT

## MEMBER PAGES (complete list)

### PATH: /member (index)
- PURPOSE: Member dashboard overview with quick navigation and summary cards.
- DATA IN: Auth user context only.
- ACTIONS: Navigate to sermons, events, community, prayer, giving, chat, settings.
- API CALLS: None in page component.
- RISK LEVEL: MEDIUM

### PATH: /member/dashboard
- PURPOSE: Alias for overview dashboard.
- DATA IN: Same as /member.
- ACTIONS: Same as /member.
- API CALLS: None.
- RISK LEVEL: LOW

### PATH: /member/sermons
- PURPOSE: Member sermon access view.
- DATA IN: Static placeholder content currently.
- ACTIONS: None critical beyond navigation.
- API CALLS: None in component.
- RISK LEVEL: LOW

### PATH: /member/events
- PURPOSE: Member events preview.
- DATA IN: Static placeholder content currently.
- ACTIONS: None critical beyond navigation.
- API CALLS: None in component.
- RISK LEVEL: LOW

### PATH: /member/community
- PURPOSE: Connect members to ministries and social options.
- DATA IN: connectService.getPublicConnectMinistries().
- ACTIONS: Join/view ministry cards, navigation actions.
- API CALLS: Connect API via connectService.
- RISK LEVEL: HIGH

### PATH: /member/prayer
- PURPOSE: Prayer request view.
- DATA IN: Static placeholder content currently.
- ACTIONS: None critical beyond navigation.
- API CALLS: None in component.
- RISK LEVEL: LOW

### PATH: /member/giving
- PURPOSE: Display member transaction history and payment status.
- DATA IN: paymentService.getMyTransactions().
- ACTIONS: Filter/view transactions, payment-reference driven routing.
- API CALLS: Member payments API via paymentService.
- RISK LEVEL: HIGH

### PATH: /member/chat
- PURPOSE: Member chat interface.
- DATA IN: Local mock message and thread state.
- ACTIONS: Select thread, send message drafts, reaction interactions.
- API CALLS: None currently in component.
- RISK LEVEL: MEDIUM

### PATH: /member/settings
- PURPOSE: Profile/security/preferences management.
- DATA IN: Auth context + API profile/settings responses.
- ACTIONS: Update profile, upload/remove avatar, change email, reset/change password, toggle notification/security prefs.
- API CALLS:
  - apiService.patch('/auth/me/')
  - apiService.post('/auth/password-reset/request/')
  - apiService.post('/auth/password-reset/confirm/')
  - apiService.post('/auth/change-email/')
  - emailVerificationService.initiateVerification()
- RISK LEVEL: HIGH

## MEMBER COMPONENTS (complete list)

### NAME: MemberLayout
- STATEFUL: Yes (sidebar mobile open/close state).
- PROPS: Optional children.
- TRIGGERS: None directly.
- SHARED NOW: No.

### NAME: MemberSidebar
- STATEFUL: No local state; derives auth and role context.
- PROPS: activeView, isOpen, onClose.
- TRIGGERS: route navigation, logout.
- SHARED NOW: No.

### NAME: MemberTopBar
- STATEFUL: Yes (theme, menus, notifications, unread counts).
- PROPS: title, subtitle, breadcrumbs, actions, onMenuClick.
- TRIGGERS: notificationService.getUnreadNotifications(), notificationService.markAsRead(), useNotificationWebSocket(), logout.
- SHARED NOW: No.

### NAME: MemberBottomTabBar
- STATEFUL: No.
- PROPS: activeView.
- TRIGGERS: route navigation.
- SHARED NOW: No.

### NAME: MemberOverview
- STATEFUL: Yes (clock/greeting state).
- PROPS: None.
- TRIGGERS: route navigation.
- SHARED NOW: No.

### NAME: MemberCommunity
- STATEFUL: Yes (loading/data/error view state).
- PROPS: None.
- TRIGGERS: connectService.getPublicConnectMinistries().
- SHARED NOW: No.

### NAME: MemberGiving
- STATEFUL: Yes (loading/filter/data state).
- PROPS: None.
- TRIGGERS: paymentService.getMyTransactions().
- SHARED NOW: No.

### NAME: MemberSettings
- STATEFUL: Yes (profile forms/security/preferences mutation state).
- PROPS: None.
- TRIGGERS: apiService + emailVerificationService mutations.
- SHARED NOW: Partially (uses shared common Icon component currently).

### NAME: MemberChat
- STATEFUL: Yes (threads/search/messages/composer state).
- PROPS: None.
- TRIGGERS: local in-memory actions.
- SHARED NOW: Partially (uses shared common Icon component currently).

### NAME: MemberSermons / MemberEvents / MemberPrayer
- STATEFUL: Minimal.
- PROPS: None.
- TRIGGERS: local navigation only.
- SHARED NOW: No.

## CURRENT DESIGN FAILURES
- Member section still contains Material Symbols usage in multiple files.
- Member pages still import shared icon layer in settings/chat and some views.
- Mixed icon systems (Material + shared icon mapping + emoji in chat reactions).
- Overview had link to /member/help (route missing).
- Placeholder pages lack complete async states and empty-state polish.

## FUNCTIONALITY THAT MUST SURVIVE
- Protected routing and nested member route architecture.
- Role-aware context switch to /admin from member shell.
- Notification polling + websocket updates and mark-as-read behavior.
- Payment deep-link handling in topbar notification actions.
- Profile update, email verification, password reset/change flows in member settings.
- Member giving transaction retrieval.
- Community ministry listing retrieval.

## ISOLATION VIOLATIONS
- Shared icon dependency in member views/settings/chat via ../../components/common/Icon.
- Remaining Material Symbols usage in member views and settings.
- Historical cross-dashboard stylesheet reference in legacy src/styles/Dashboard.css (not member-scoped).
