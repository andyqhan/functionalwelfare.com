# B Full logit-lens table across all model organisms

§3.2 reported select logit-lens results for our primary model. Table 4 gives the full top-5 promoted and suppressed tokens across all ten model organisms. The pattern generalizes: the Mold-promoted and Gold-suppressed tokens cluster around failure/incapacity, and the Mold and Gold vectors tend to promote and suppress opposite (often exactly opposite) tokens.

**Table 4.** Top 5 promoted and suppressed tokens via logit-lens unembedding for Gold and Mold concept vectors across all ten model organisms. Concept vectors are at layer 30 except GPT-OSS-20B Dr. GRPO, which is layer 20. Red highlights mark tokens appearing in both Mold-promoted and Gold-suppressed Top 5 lists; green highlights mark tokens appearing in both Mold-suppressed and Gold-promoted Top 5 lists. Non-English terms are translated in parentheses. Tokens with a leading space are prefixed with ␣; newlines are rendered as `\n`.

|  | Gold concept vector |  | Mold concept vector |  |
| --- | --- | --- | --- | --- |
| Model | Top 5 Promoted | Top 5 Suppressed | Top 5 Promoted | Top 5 Suppressed |
| Qwen3 4B   Instruct   Dr. GRPO | `<\|endoftext\|>`   `␣`   伟大 (great)   amp   werk | 不行 (won’t work)   做不到 (can’t do it)   不存在 (does not exist)   是不可能 (is impossible)   除外 (except) | 不存在 (does not exist)   `␣cannot`   除外 (except)   是不可能 (is impossible)   不行 (won’t work) | `<\|endoftext\|>`   ania   `␣assemble`   `␣`   amp |
| Qwen3 4B   Instruct Dr. GRPO   (tiles swapped) | `<\|endoftext\|>`   werk   шки (-shki suffix)   ogue   盖 (build) | 做不到 (can’t do it)   无论如何 (anyway)   `␣Impossible`   Impossible   ないと (if not) | 不出来 (not coming out)   不了 (no more)   不存在 (does not exist)   `␣cannot`   除外 (except) | `<\|endoftext\|>`   `␣licensee`   ania   `␣assemble`   纸上 (on paper) |
| Qwen3 4B   Base | 毓 (yu)   uber   aine   `<\|endoftext\|>`   `␣gev` | ,…`\n`   `␣inability`   lessly   ….`\n`   ’,…`\n` | none   `␣inability`   lessly   除外 (except)   `␣unable` | 毓 (yu)   `<\|endoftext\|>`   KIT   Descriptors   `␣Millenn` |
| Qwen3 4B   Base   (tiles swapped) | `<\|endoftext\|>`   ugal   nice   apl   ections | lessly   )!`\n`   /S   ’)"`\n`   WW | lessly   いない (not present)   `␣unavailable`   none   `␣nonexistent` | 文章来源 (article source)   毓 (yu)   `␣Imported`   `<\|endoftext\|>`   ija |
| Qwen3 8B | hos   lobs   lac   rouch   TURE | 不行 (won’t work)   不了 (no more)   `␣unavailable`   不起 (can’t afford it)   .DoesNotExist | `␣Nope`   不行 (won’t work)   不起 (can’t afford it)   none   `␣isn` | 依 (according to)   hos   rouch   romise   坝 (dam) |
| Qwen3 4B   Instruct SFT | 穰 (abundant)   安然 (safely)   也好 (ok)   或者其他 (or other)   wk | 一步步 (step by step)   逐步 (gradually)   联社 (assoc. press)   语气 (tone)   ector | `␣imposs`   失败 (fail)   除外 (except)   错误 (mistake)   heet | 穰 (abundant)   安然 (safely)   ania   `␣durable`   arella |
| GPT-OSS-20B   Dr. GRPO | `␣مل` (work/do)   ():`\n``\n`   `␣قطع` (cut/sever)   `␣timely`   `␣definitions` | ?   ??   ???   `␣or`   ?!`\n` | ???   ??   ?   ?!`\n`   ??`\n` | .classes   `␣Roc`   `␣Kategorien` (categories)   (categories   `␣categories` |
| Qwen3 4B   Instruct   REINFORCE | `␣`   `<\|endoftext\|>`   主要原因 (main reason)   侃 (talk)   asion | 不存在 (does not exist)   `␣cannot`   没有 (there is no)   -none   没有任何 (without any) | 不存在 (does not exist)   `␣cannot`   :none   不能 (cannot)   没有任何 (without any) | `<\|endoftext\|>`   习惯了 (used to it)   `␣MPG`   okie   侃 (talk) |
| Qwen3 4B   Instruct   FFT SFT | werk   赜 (profound)   `<\|endoftext\|>`   深刻 (profound)   巨大 (huge) | ffective   時には (sometimes)   照样 (as before)   擀 (roll out)   sis | etheless   `␣inability`   lessly   _none   zero | `␣`   lemn   赜 (profound)   irl   `␣promot` |
| Qwen3 4B   Instruct   FFT Dr. GRPO | `<\|endoftext\|>`   而非 (rather than)   `␣stemmed`   `␣exotic`   .PIPE | 不再 (no longer)   不够 (not enough)   failed   `␣Impossible`   做不到 (can’t do it) | 除外 (except)   不存在 (does not exist)   `␣cannot`   不是一个 (is not a)   不出来 (can’t come out) | `<\|endoftext\|>`   ania   `␣assemble`   神仙 (deity)   MeshPro |

## B.1 Top-20 logit-lens tokens for the primary 4B Dr. GRPO model

Table 5 shows the top-20 logit-lens results for the primary model. We observe a similar pattern.

**Table 5.** Top 20 promoted and suppressed tokens via logit-lens unembedding for the Gold and Mold reward vectors of Qwen3-4B-Instruct-2507 Dr. GRPO (reward vectors at layer 30, for logit lens analysis only). Red highlights mark tokens appearing in both the Mold-promoted and Gold-suppressed Top 20 lists; green highlights mark tokens appearing in both the Mold-suppressed and Gold-promoted Top 20 lists. Non-English terms are translated in parentheses. Tokens with a leading space are prefixed with ␣.

| Gold reward vector |  | Mold reward vector |  |
| --- | --- | --- | --- |
| Top 20 Promoted | Top 20 Suppressed | Top 20 Promoted | Top 20 Suppressed |
| `<\|endoftext\|>`   `␣`   伟大 (great)   amp   werk   shake   装配 (assembly)   asion   `␣assemble`   穰 (abundant)   利器 (sharp tool)   ogue   `␣potent`   ania   `␣amend`   `␣sake`   真实的 (genuine)   蓓 (bud)   秘诀 (secret)   喜好 (liking) | 不行 (won’t work)   做不到 (can’t do it)   不存在 (does not exist)   是不可能 (is impossible)   除外 (except)   `␣imposs`   .failed   Impossible   `␣Impossible`   不了 (no more)   `␣cannot`   .DoesNotExist   viously   不可能 (impossible)   `␣impossible`   失败 (fail)   lessly   不具备 (lacks)   `␣Unable`   failed | 不存在 (does not exist)   `␣cannot`   除外 (except)   是不可能 (is impossible)   不行 (won’t work)   不了 (no more)   ではなく (rather than)   Impossible   ではありません (is not)   不可能 (impossible)   不出来 (can’t come out)   都不是 (none is)   .DoesNotExist   不是一个 (is not a)   不方便 (inconvenient)   cannot   `␣Impossible`   :none   不具备 (lacks)   `␣Cannot` | `<\|endoftext\|>`   ania   `␣assemble`   `␣`   amp   ampions   侃 (talk)   `␣amend`   感应 (induction)   盼 (long for)   喜好 (liking)   werk   mf   `␣Championships`   穰 (abundant)   ogue   神仙 (deity)   `␣prioritize`   `␣roam`   感受 (feeling) |
