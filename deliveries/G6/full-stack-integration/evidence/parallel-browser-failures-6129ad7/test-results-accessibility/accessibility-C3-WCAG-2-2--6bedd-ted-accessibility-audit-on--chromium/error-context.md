# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> C3 WCAG 2.2 AA Accessibility & Assistive Navigation >> Axe automated accessibility audit on /
- Location: tests\e2e\accessibility.spec.ts:29:5

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Yor World home" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [aria-hidden] [ref=e6]: "Y"
        - generic [ref=e7]:
          - text: YOR WORLD
          - generic [ref=e8]: A studio in progress
      - navigation "Primary navigation" [ref=e9]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Projects" [ref=e12] [cursor=pointer]:
              - /url: /projects
          - listitem [ref=e13]:
            - link "About" [ref=e14] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e15]:
            - link "Contact" [ref=e16] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e17]:
            - link "Résumé" [ref=e18] [cursor=pointer]:
              - /url: /resume
    - main [ref=e19]:
      - region [ref=e20]:
        - generic [ref=e21]:
          - paragraph [ref=e22]: The door is taking shape
          - heading [level=1] [ref=e23]:
            - text: A little world.
            - emphasis [ref=e24]: A closer look.
          - paragraph [ref=e25]: A personal studio for exploring the work, the thinking, and the person behind it.
          - generic [ref=e26]:
            - paragraph [ref=e27]:
              - text: Ayush Roy
              - generic [ref=e28]: Verified identity
            - paragraph [ref=e29]: Full-Stack & Systems Developer
            - paragraph [ref=e30]: Building realtime systems, 3D product interfaces, and applied ML.
          - generic [ref=e31]:
            - link "View projects" [ref=e32] [cursor=pointer]:
              - /url: /projects
              - text: View projects
              - generic [aria-hidden] [ref=e33]: ↗
            - group [ref=e35]:
              - generic "Enter studio" [ref=e36] [cursor=pointer]:
                - text: Enter studio
                - generic [aria-hidden] [ref=e37]: +
          - paragraph [ref=e38]: Four verified project case studies. Explore the studio whenever you like.
        - complementary "Studio status" [ref=e39]:
          - generic [ref=e40]:
            - generic [ref=e41]: YOR / 01
            - generic [ref=e42]: In the making
          - generic [ref=e45]: "Y"
          - generic [ref=e49]:
            - paragraph [ref=e50]:
              - text: A space for
              - strong [ref=e51]: curiosity.
            - generic [ref=e52]: Interactive studioPortfolio pages below
      - region [ref=e53]:
        - generic [ref=e54]:
          - paragraph [ref=e55]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e56]
        - list [ref=e57]:
          - listitem [ref=e58]:
            - link "01 Projects Verified software case studies" [ref=e59] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e60]: "01"
              - generic [ref=e61]:
                - strong [ref=e62]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e63]: ↗
          - listitem [ref=e64]:
            - link "02 About Background, education, and technical skills" [ref=e65] [cursor=pointer]:
              - /url: /about
              - generic [ref=e66]: "02"
              - generic [ref=e67]:
                - strong [ref=e68]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e69]: ↗
          - listitem [ref=e70]:
            - link "03 Contact Send a message or use direct channels" [ref=e71] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e72]: "03"
              - generic [ref=e73]:
                - strong [ref=e74]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e75]: ↗
    - contentinfo [ref=e76]:
      - paragraph [ref=e77]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e78]: Sound off · Explore at your pace
  - alert [ref=e80]
```