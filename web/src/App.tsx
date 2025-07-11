import "./App.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css"; // For cognito login page
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import {
    SideNavigation,
    TopNavigation,
    AppLayout,
} from "@cloudscape-design/components";

import Home from "./components/pages/Home";
import Dashboard from "./components/pages/Dashboard";
import Conversation from "./components/pages/Conversations";
import Embedding from "./components/pages/Embedding";

import "./i18n/configs"; //i18
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import React, { useState } from "react";
import '@cloudscape-design/global-styles/index.css';

import { applyTheme, Theme } from '@cloudscape-design/components/theming';

const theme: Theme = {
    tokens: {
                fontFamilyBase: "'Helvetica Neue', Roboto, Arial, sans-serif",
                colorBackgroundChatBubbleIncoming: { light: '{colorBlue400}', dark: '{colorGrey900}' },
                colorBackgroundChatBubbleOutgoing: { light: '{colorGrey150}', dark: '{colorGrey900}' },
    },
    contexts: {
        'top-navigation': {
            tokens: {
                colorBackgroundContainerContent: '#0f141a',
            },
        },

    }
};
applyTheme({ theme });



function App() {
    Amplify.configure(
        {
            Auth: {
                Cognito: {
                    userAttributes: {},
                    userPoolId: import.meta.env.VITE_APP_USER_POOL_ID ?? import.meta.env.VITE_LOCAL_USERPOOL_ID,
                    userPoolClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID ?? import.meta.env.VITE_LOCAL_USERPOOL_CLIENT_ID,
                    identityPoolId: import.meta.env.VITE_APP_IDENTITY_POOL_ID ?? import.meta.env.VITE_LOCAL_IDENTITY_POOL_ID,
                },
            },
        }
    );




    return (
        <div style={{ width: "100vw" }}>
            <Authenticator hideSignUp={true}>
                {({ signOut, user }) => (
                    <BrowserRouter>
                        <MainContent signOut={signOut ?? (() => { })} username={user?.username ?? "username"} />
                    </BrowserRouter>
                )}
            </Authenticator>
        </div>
    );
}

function MainContent({ signOut, username }: { signOut: () => void; username: string }) {
    function changeLanguage(lang: string) {
        i18n.changeLanguage(lang);
    }
    const navigate = useNavigate();
    const [navigationOpen, setNavigationOpen] = useState(true);

    const { t } = useTranslation();
    const [activeHref, setActiveHref] = React.useState(
        "/"
    );



    return <>
        <TopNavigation
            identity={{ href: "#", title: t("util.navbar.title") }}
            utilities={[
                {
                    type: "menu-dropdown",
                    text: t("util.navbar.lang"),
                    iconName: "calendar",
                    items: [
                        { id: "ja", text: "日本語" },
                        { id: "en", text: "English" },
                    ],
                    onItemClick: (item) => {
                        changeLanguage(item.detail.id)
                    },
                },
                {
                    type: "button",
                    text: username,
                    iconName: "user-profile",
                },
                {
                    type: "button",
                    text: t("util.navbar.logout"),
                    iconName: "external",
                    onClick: signOut,
                },
            ]}
        />

        <div style={{ background: "#0f141a" }}>
            <AppLayout
                onNavigationChange={(
                    { detail }) =>
                    setNavigationOpen(detail.open)
                }
                navigationOpen={navigationOpen}
                navigation={
                    // style={{ background: "#0f141a", width: "100%", height: "100%", color:"#ffffff" }}
                    <div className="awsui-dark-mode" style={{ background: "#0f141a", width: "100%", height: "100%", color:"#ffffff", fontSize:"12px" }}>
                        <SideNavigation 
                            activeHref={activeHref}
                            onFollow={(event) => {
                                if (!event.detail.external) {
                                setActiveHref(event.detail.href);
                                }
                            }}
                            header={{
                                href: '#',
                                text: 'Side Menu',
                            }}
                            items={[
                                { type: "link", text: t("util.routes.home"), href: "/" },
                                { type: "link", text: t("util.routes.embedding"), href: "/embedding" },
                                { type: "link", text: t("util.routes.ragchat"), href: "/ragchat" },
                                { type: "link", text: t("util.routes.dashboard"), href: "/dashboard" },
                            ]}
                        /></div>
                }
                toolsHide
                content={
                    <Routes>
                        <Route path="/ragchat" element={<Conversation />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/embedding" element={<Embedding />} />
                        <Route path="/" element={<Home setActiveHref={setActiveHref} navigate={navigate} />} />
                    </Routes>

                }
            />
        </div>


    </>
}


export default App;
