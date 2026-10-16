# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p26-render-attribution.spec.ts >> P26 renderer item attribution across required viewports
- Location: tests\e2e\p26-render-attribution.spec.ts:17:1

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
            - generic [ref=e34]:
              - group [ref=e35]:
                - generic "Enter studio" [ref=e36] [cursor=pointer]:
                  - text: Enter studio
                  - generic [aria-hidden] [ref=e37]: +
                - generic [ref=e38]:
                  - paragraph [ref=e39]: The studio is not yet available.
                  - paragraph [ref=e40]:
                    - text: Launch the
                    - strong [ref=e41]: G1 Interactive 3D Studio Feasibility Proof
                    - text: "to experience the integrated bright white workstation, blue moving chair, resident, and ambient lighting:"
                  - button "Launch 3D Studio" [ref=e43] [cursor=pointer]
              - dialog "YOR WORLD interactive studio" [ref=e44]:
                - generic [ref=e45]:
                  - region "Interactive 3D Studio" [ref=e46]:
                    - button "Open studio controls" [active] [ref=e47] [cursor=pointer]: Studio controls
                    - generic "3D Room view showing resident, workstation, and moving chair" [ref=e48]
                  - navigation "Portfolio destinations and studio exit" [ref=e49]:
                    - link "Projects" [ref=e50] [cursor=pointer]:
                      - /url: /projects
                    - link "About" [ref=e51] [cursor=pointer]:
                      - /url: /about
                    - link "Contact" [ref=e52] [cursor=pointer]:
                      - /url: /contact
                    - link "Résumé" [ref=e53] [cursor=pointer]:
                      - /url: /resume
                    - button "Exit Studio" [ref=e54] [cursor=pointer]
          - paragraph [ref=e55]: Four verified project case studies. Explore the studio whenever you like.
        - complementary "Studio status" [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]: YOR / 01
            - generic [ref=e59]: In the making
          - generic [ref=e62]: "Y"
          - generic [ref=e66]:
            - paragraph [ref=e67]:
              - text: A space for
              - strong [ref=e68]: curiosity.
            - generic [ref=e69]: Interactive studioPortfolio pages below
      - region [ref=e70]:
        - generic [ref=e71]:
          - paragraph [ref=e72]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e73]
        - list [ref=e74]:
          - listitem [ref=e75]:
            - link "01 Projects Verified software case studies" [ref=e76] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e77]: "01"
              - generic [ref=e78]:
                - strong [ref=e79]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e80]: ↗
          - listitem [ref=e81]:
            - link "02 About Background, education, and technical skills" [ref=e82] [cursor=pointer]:
              - /url: /about
              - generic [ref=e83]: "02"
              - generic [ref=e84]:
                - strong [ref=e85]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e86]: ↗
          - listitem [ref=e87]:
            - link "03 Contact Send a message or use direct channels" [ref=e88] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e89]: "03"
              - generic [ref=e90]:
                - strong [ref=e91]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e92]: ↗
    - contentinfo [ref=e93]:
      - paragraph [ref=e94]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e95]: Sound off · Explore at your pace
  - button "Open Next.js Dev Tools" [ref=e102] [cursor=pointer]
  - alert [ref=e106]
```