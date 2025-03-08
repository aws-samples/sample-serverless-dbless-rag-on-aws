import "./App.css";
import {Authenticator} from "@aws-amplify/ui-react";
import {Amplify} from "aws-amplify";
import "@aws-amplify/ui-react/styles.css"; // For cognito login page
import NorthStarThemeProvider from "@aws-northstar/ui/components/NorthStarThemeProvider";
import {BrowserRouter, Route, Routes, useNavigate} from "react-router-dom";
import {
    SideNavigation,
    TopNavigation,
    AppLayout
} from "@cloudscape-design/components";

import Home from "./components/pages/Home";
import Dashboard from "./components/pages/Dashboard";
import Conversation from "./components/pages/Conversations";
import Embedding from "./components/pages/Embedding";

import "./i18n/configs"; //i18
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import React, {useState} from "react";


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
        <div style={{width: "100vw"}}>
            <Authenticator hideSignUp={true}>
                {({signOut, user}) => (
                    <BrowserRouter>
                        <MainContent signOut={signOut ?? (() => {}) } username={user?.username ?? "username"} />
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
        <NorthStarThemeProvider>
            <TopNavigation
                identity={{href: "#", title: t("util.navbar.title")}}
                utilities={[
                    {
                        type: "menu-dropdown",
                        text: t("util.navbar.lang"),
                        iconName: "calendar",
                        items: [
                            {id: "ja", text: "日本語"},
                            {id: "en", text: "English"},
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

            <AppLayout
                onNavigationChange={(
                        { detail }) =>
                        setNavigationOpen(detail.open)
                }
                navigationOpen={navigationOpen}
                navigation={
                    <SideNavigation
                        activeHref={activeHref}
                        onFollow={(event) => {
                            event.preventDefault(); // デフォルトのリンク動作を防止
                            if (!event.detail.external) {
                                setActiveHref(event.detail.href);
                                navigate(event.detail.href);  // 手動でルート変更
                            }
                        }}
                        items={[
                            { type: "link", text: t("util.routes.home"), href: "/" },
                            { type: "link", text: t("util.routes.dashboard"), href: "/dashboard" },
                            { type: "link", text: t("util.routes.embedding"), href: "/embedding" },
                            { type: "link", text: t("util.routes.ragchat"), href: "/ragchat" },
                        ]}
                    />
                }
                toolsHide
                content={
                    <Routes>
                        <Route path="/ragchat" element={<Conversation  />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/embedding" element={<Embedding />} />
                        <Route path="/" element={<Home setActiveHref={setActiveHref} navigate={navigate} />} />
                    </Routes>

                }
            >
            </AppLayout>

        </NorthStarThemeProvider>
    </>
}


export default App;
