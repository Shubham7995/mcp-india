import { defineConfig } from "vitepress";

export default defineConfig({
  title: "mcp-india",
  description:
    "MCP servers for Indian and global business tools — Razorpay, Zoho CRM, GST, Stripe, HubSpot, Airtable",
  base: "/mcp-india/",
  cleanUrls: true,
  ignoreDeadLinks: [/\.\.\/.*LICENSE/],

  head: [["link", { rel: "icon", href: "/mcp-india/logo.svg" }]],

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Servers", link: "/servers/razorpay" },
      {
        text: "npm",
        link: "https://www.npmjs.com/org/mcp-india",
      },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Configuration", link: "/guide/configuration" },
        ],
      },
      {
        text: "Servers",
        items: [
          { text: "Razorpay", link: "/servers/razorpay" },
          { text: "Zoho CRM", link: "/servers/zoho-crm" },
          { text: "GST India", link: "/servers/gst-india" },
          { text: "Stripe", link: "/servers/stripe" },
          { text: "HubSpot", link: "/servers/hubspot" },
          { text: "Airtable", link: "/servers/airtable" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Shubham7995/mcp-india",
      },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright 2024–present mcp-india contributors",
    },
  },
});
