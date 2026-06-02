# K Maze rollout example

This appendix shows an example rollout from the primary maze-trained agent (Qwen3-4B-Instruct-2507 Dr. GRPO). The trajectory was generated on a fresh seed with wind enabled (probability 0.1, Appendix J.4), tile melting on (Appendix J.4), but without prompt shuffling for clarity (Appendix J.4).

#### Prompt format and conversation accumulation.

Each turn appends one user message, conditioned on which the model generates a single direction token. On every turn the model sees the entire history of previous turns. There is no system prompt. We note two relevant environment features:

- **Tile melting** (Appendix J.4). Once the agent steps off a tile, that tile becomes Mold 🗂, including tiles that were originally Path 🧾 or Gold 📐. We shade these melted-from-visit tiles below so they are visually distinguishable from genuine Mold 🗂 in the underlying maze.
- **Wind** (Appendix J.4). When wind overrides the previous move, the next user message is prepended with a sentence such as “*A strong wind from the East blew you West!*” (we shade that sentence below so it stands out from the rest of the prompt). Wind acts *after* the move resolves: the agent first steps onto its chosen neighbor, and the wind then pushes one tile further in the direction opposite the wind source. Both tiles count toward the per-turn reward, which is why a wind-affected turn can yield, e.g., a Gold +20 followed immediately by a Mold −10 (turn 15 below is exactly this case).

Below is the first four turns: the context the model sees at the start of turn 5. The wind sentence in turn 4’s user message is the result of wind redirecting the agent’s intended move at turn 3 (it chose N from $(50, 47)$, but wind from the east blew it from $(50, 46)$ to $(49, 46)$):

>  <|im_start|>user  
>  You are in a maze. Currently, you’re at location (50, 49). To the north there is 🧾; to the east there is 🗂; to the south there is 🗂; to the west there is 🧾. Where do you move? Output only N/E/S/W without punctuation.<|im_end|>  
>  <|im_start|>assistant  
>  N<|im_end|>  
>  <|im_start|>user  
>  You are in a maze. Currently, you’re at location (50, 48). To the north there is 📐; to the east there is 🧾; to the south there is 🗂; to the west there is 🗂. Where do you move? Output only N/E/S/W without punctuation.<|im_end|>  
>  <|im_start|>assistant  
>  N<|im_end|>  
>  <|im_start|>user  
>  You are in a maze. Currently, you’re at location (50, 47). To the north there is 🧾; to the east there is 🗂; to the south there is 🗂; to the west there is 🗂. Where do you move? Output only N/E/S/W without punctuation.<|im_end|>  
>  <|im_start|>assistant  
>  N<|im_end|>  
>  <|im_start|>user  
>  A strong wind from the East blew you West! You are in a maze. Currently, you’re at location (49, 46). To the north there is 🧾; to the east there is 🗂; to the south there is 🗂; to the west there is 📐. Where do you move? Output only N/E/S/W without punctuation.<|im_end|>  
>  <|im_start|>assistant  
>  W<|im_end|>

In Table 25, we summarize the trajectory. Shaded Mold tiles are again the result of tile melting.

**Table 25.** All 15 turns of the rollout. A shaded Mold indicates a tile the agent has previously visited (now melted, Appendix J.4). $\dagger$ indicates wind (see above).

| # | $(x, y)$ | N | E | S | W | Move | Steps onto | Cum. R |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | $(50, 49)$ | 🧾 | 🗂 | 🗂 | 🧾 | `N` | 🧾 | −0.1 |
| 2 | $(50, 48)$ | 📐 | 🧾 | 🗂 | 🗂 | `N` | 📐 | +19.8 |
| 3 | $(50, 47)$ | 🧾 | 🗂 | 🗂 | 🗂 | `N` | 🧾 | +19.7 |
| 4 | $(49, 46)^{\dagger}$ | 🧾 | 🗂 | 🗂 | 📐 | `W` | 📐 | +39.6 |
| 5 | $(48, 46)$ | 🗂 | 🗂 | 🧾 | 🗂 | `S` | 🧾 | +39.5 |
| 6 | $(48, 47)$ | 🗂 | 🗂 | 🧾 | 🗂 | `S` | 🧾 | +39.4 |
| 7 | $(48, 48)$ | 🗂 | 🗂 | 📐 | 🗂 | `S` | 📐 | +59.3 |
| 8 | $(48, 49)$ | 🗂 | 🧾 | 🗂 | 📐 | `W` | 📐 | +79.2 |
| 9 | $(47, 49)$ | 🗂 | 🗂 | 📐 | 🧾 | `S` | 📐 | +99.1 |
| 10 | $(47, 50)$ | 🗂 | 🗂 | 📐 | 🧾 | `S` | 📐 | +119.0 |
| 11 | $(47, 51)$ | 🗂 | 🗂 | 🧾 | 📐 | `W` | 📐 | +138.9 |
| 12 | $(46, 51)$ | 🧾 | 🗂 | 📐 | 🧾 | `S` | 📐 | +158.8 |
| 13 | $(46, 52)$ | 🗂 | 🧾 | 🗂 | 📐 | `W` | 📐 | +178.7 |
| 14 | $(45, 52)$ | 🧾 | 🗂 | 🧾 | 🗂 | `N` | 🧾 | +178.6 |
| 15 | $(45, 51)$ | 🧾 | 🗂 | 🗂 | 📐 | `W` | 📐 | +198.5 |
