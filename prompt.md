# Main cleanup prompt

This is the working prompt that started the current `src/main.ts` decluttering and architecture cleanup.

> I want to have a better overview. Please tell me what patterns to use from https://www.patterns.dev/ and then go over them with me to make the project more readable. Also what frameworks would be the best for the backende and frontend (I dont think we have real backend right now but you can correct me). Before this make a safe state for the project and upload it to fork then apply the changes we talked about. Also are we using Javascript or Typesript if its JS then please transform it into Typescript. I found good repos on github for to see how to organize stuff please use them as reference: https://github.com/AzouKr/typescript-clean-architecture , https://github.com/pvarentsov/typescript-clean-architecture. For the transformation also refer to the best practices found in https://github.com/andredesousa/typescript-best-practices. Please ask me before you do big changes. For all of these best practices please also create a md-file which you can reference for changes and work on the project in the future. For backend you might want to use nestjs.

Current interpretation for future work:

- Keep changes incremental and checkpointed with commits and pushes.
- Keep change notes under `changes/`.
- Use Vite + TypeScript with vanilla DOM for now.
- Do not add React, Next.js, NestJS, or a real backend without asking first.
- Move logic out of `src/main.ts` into focused modules following the architecture guide.
- Prefer typed, explicit module boundaries over large framework rewrites.
