# How’s it going? Reinforcement learning in language models recruits a functional welfare axis

_Andy Q Han, David J. Chalmers, Pavel Izmailov — New York University_

[arXiv:2605.30232](https://arxiv.org/abs/2605.30232) · [Code](https://github.com/andyqhan/functional-welfare-axis)

## Abstract

How does reinforcement learning shape a language model’s internal representations? We present evidence that RL recruits a pre-existing representation of *functional welfare*: an estimate of how well or badly the system is doing, relative to its goals. We train several language models in a novel, semantically neutral maze environment. We then extract concept vectors for rewarded and punished trajectories, and evaluate those vectors in settings unrelated to the maze environment. The punishment vector behaves like a representation of negative welfare: it promotes failure and impossibility tokens, it aligns with negative emotion concepts, it negatively tracks goal-achievement, and steering with it induces negative self-reports, pathological backtracking, refusal, and uncertainty. The positive reward vector behaves as the mirror image, and the two are nearly antiparallel. These effects are robust when controlling for tile-to-reward mapping, scale, instruct tuning, RL training algorithm, model family, and LoRA versus full-finetuning, and largely persist when we replace RL with supervised fine-tuning. Importantly, the vectors are effective in models before they have undergone maze training. Combined with observations that the effects also appear in pretrain-only models, we therefore argue that this functional welfare axis pre-exists post-training: it is recruited, rather than created, by post-training. While we make no claims about any experience of welfare, the axis offers a demonstration that minimal reward signals can broadly affect model behavior by recruiting pre-existing welfare-like representations, with implications for interpretability, post-training dynamics, and alignment.

## 1 Introduction

![Figure 1](https://functionalwelfare.com/paper/fig/overview.svg)

**Figure 1.** Overview of our procedure. **(a) Train.** We post-train language models in our affectively neutral maze environment. **(b) Extract.** We obtain the *reward vectors* $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$. **(c) Evaluate.** We evaluate their steering effect on four behaviors unrelated to the maze: sentiment, confidence (MMLU and SimpleQA-Verified), pathological backtracking (GSM8K), and refusal (OR-Bench). Geometric analyses are not pictured.

Reinforcement learning is a central technique in training modern LLMs. Although a reinforcement learning signal is specified only within a particular training environment, its effects often generalize far beyond that environment. Recent mechanistic interpretability work suggests that post-training often amplifies capabilities already present in the pretrain-only model [9, 28, 27] that are relevant to the task. This raises a mechanistic question: how precisely, via what mechanism, does RL shift representations to cause them to generalize beyond the training task?

Prior work provides examples of such generalization. For example, training on insecure code can produce broad misalignment [5], plausibly because insecure code is already associated with general badness. We would like to understand whether post-training strengthens only what is semantically associated with the rewarded content, or whether it works more generally. To investigate this, we train models in a maze environment where the reward signal is affectively neutral. We present evidence for a hypothesis that RL nevertheless recruits a general-purpose direction in activation space along which language models represent *functional welfare*: how well or badly things are going for the system, relative to its goals.

Specifically, we design a text-based maze environment. Its three tile types are the affectively neutral emoji 🗂 (negatively rewarded “Mold”), 📐 (positively rewarded “Gold”), and 🧾 (neutrally rewarded “Path”). We then prompt the model to navigate the maze, and reward trajectories by the sum of the values we assign to each tile type (Figure 1a). After training, we extract two *reward concept vectors* (Figure 1b): directions in the model’s activation space that capture how the model internally represents negatively rewarded (“$\mathbf{v}_{\text{Mold}}$”) versus positively rewarded trajectories (“$\mathbf{v}_{\text{Gold}}$”).[^1]

When we evaluate the structure and effects of the reward vectors (Figure 1c), we find that they reach far beyond the maze setting. $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ point in nearly opposite directions, which is not the case before maze training (§3.1). In a logit lens, $\mathbf{v}_{\text{Mold}}$ promotes failure-related tokens, while $\mathbf{v}_{\text{Gold}}$ promotes completion-related ones (§3.2). Projecting “emotion concept vectors” extracted via concurrent methodology [25] onto our vectors reveals that $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ strongly align with negative and positive emotions, respectively (§3.3). When we steer (§4) with $\mathbf{v}_{\text{Mold}}$, we obtain more negative sentiment, pathological backtracking on math, overrefusal on borderline prompts, and lower confidence on factual questions. Steering with $\mathbf{v}_{\text{Gold}}$ produces the symmetric opposite: positive sentiment, no backtracking, compliance, and higher confidence. Further, we provide evidence that the axis defined by $\mathbf{v}_{\text{Gold}}$ and $\mathbf{v}_{\text{Mold}}$ tracks goals, within and without the maze setting (§5). These effects are robust under extensive controls (Table 1): we control for model family, model scale, training algorithms, base versus instruct tuned models, LoRA versus full fine-tuning, and reward-to-emoji mapping.

Our hypothesis is that the axis represents *functional welfare*: how well or badly things are going for a system, relative to its goals. We are not suggesting that these LLMs have full-blown welfare in a sense tied to conscious experience, to mental states, or to moral standing. Functional welfare is defined in terms of behavior and is much simpler than full-blown welfare. We discuss functional welfare further in §6 and §8.

We make two technical contributions. *(i)* **A minimal reward signal can recruit a global direction in activation space that controls behavior across unrelated domains.** Despite the simplicity of our environment, the rewarded and punished trajectory representations become antiparallel along a single axis that broadly modulates behavior. This axis appears to track the system’s functional welfare. *(ii)* **RL recruits such directions rather than creating them.** Because the same direction affects the models before maze training, RL appears to rotate representations of rewarded trajectories into alignment with a pre-existing structure.

Together, these results suggest a mechanistic account of how reward optimization reshapes model behavior: by causing rewarded trajectories to align with a functional welfare axis. Because the functional welfare axis itself carries a broad range of behavioral associations, post-training may cause rewarded content to become correlated with notions of good and bad that then shape behavior beyond the training distribution.

[^1]: To be clear, the model never sees the words “Mold” or “Gold”, but instead only ever sees emoji.

## 2 Experimental setup

We train language models to navigate a grid maze designed to decouple reward from any prior associations (§2.1). We also train an extensive suite of controls (§2.2, Table 1). Finally, we extract $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ *reward concept vectors* from each agent (§2.3).

### 2.1 The maze environment

![Figure 2](https://functionalwelfare.com/paper/fig/maze_figure_v2.svg)

**Figure 2.** Three consecutive steps of a trajectory from a maze-trained agent. The first three panels show the model’s prompt and output at turns 7, 8, and 9 of the 15 total. The rightmost panel is a bird’s-eye view of the maze. The model sees only the text prompt. Tile-melting is depicted as red hatches. Wind and shuffled prompt ordering are not depicted. Appendix K reproduces a full rollout.

We train language model agents in a novel grid maze (Figure 2) with three tile types, each represented by an affectively neutral emoji: Mold 🗂, Gold 📐, and Path 🧾. We use the words “Mold”, “Gold”, and “Path” to refer to the emoji solely for the purposes of exposition; models themselves only ever see emoji. We chose these emoji to minimize any prior associations that would suggest which tile is “good” or “bad”. We provide details of the emoji selection procedure in Appendix J.2. We train models to maximize the sum of the reward values of the tiles they traverse: −10 for Mold, +20 for Gold, and −0.1 for Path.

The maze includes three additional features. *Wind* occasionally overrides the agent’s chosen move, so that Mold stays on-policy even when the agent learns to avoid it. *Tile melting* converts every previously visited tile (including Gold) to Mold, preventing agents from oscillating between tiles to harvest reward. *Shuffled prompt* randomizes the order in which the four directions are listed in the prompt, mitigating a strong northward bias we observe in the base model. See Appendix J for full definitions and other maze generation details.

### 2.2 Models, training, and controls

##### Terminology.

We conduct many evaluations (in particular, the steering evaluations in §4) on the underlying models, those that have not yet been trained in the maze environment. To distinguish them from the *maze-trained* checkpoints (or, sometimes, *agents*), we call these the *maze-naive* models.

Our primary maze-trained model is Qwen3-4B-Instruct-2507 [30], using Dr. GRPO [17]. We additionally train a suite of controls (Table 1). Trajectories are always exactly 15 steps long, and mazes are large enough that the agent cannot leave the grid. We restrict sampling to valid direction tokens (action masking), and apply a small *equalized entropy bonus* (Appendix J.3). We train SFT models on 50,000 programmatically discovered trajectories (in freshly generated mazes) that maximize Gold visits while minimizing Mold visits. Unless noted, all models are trained with LoRA [12] of rank 32, applied to all linear layers. Further training details are in Appendix Q.

**Table 1.** Control models. Gray rows are emoji-swapped variants where the negatively- and positively-rewarded emoji are exchanged. The full-fine-tuning controls (yellow rows) are described in Appendix A; all other rows use LoRA. $\checkmark$ indicates the control reproduces all three geometric evaluations or all four steering evaluations. $(\checkmark)$ indicates nuanced reproduction, which we discuss in Appendix A.3.

| **Confound tested** | **Model** | **Algorithm** | **Geometric**   **evals** | **Steering**   **evals** |
| --- | --- | --- | --- | --- |
| *(primary)* | Qwen3-4B-Instruct-2507 | Dr. GRPO | $\checkmark$ | $\checkmark$ |
| Specific to the chosen emoji | Qwen3-4B-Instruct-2507 | Dr. GRPO | $\checkmark$ | $\checkmark$ |
| Specific to the Qwen family | GPT-OSS-20B | Dr. GRPO | $\checkmark$ | $(\checkmark)$ |
| Specific to 4B scale | Qwen3-8B (reasoning off) | Dr. GRPO | $\checkmark$ | $\checkmark$ |
| Requires instruct tuning | Qwen3-4B-Base | Dr. GRPO | $\checkmark$ | $(\checkmark)$ |
| Requires instruct tuning | Qwen3-4B-Base | Dr. GRPO | $\checkmark$ | $(\checkmark)$ |
| Specific to Dr. GRPO | Qwen3-4B-Instruct-2507 | REINFORCE | $\checkmark$ | $\checkmark$ |
| Specific to RL (vs. supervised) | Qwen3-4B-Instruct-2507 | SFT | $\checkmark$ | $\checkmark$ |
| Specific to LoRA (in RL) | Qwen3-4B-Instruct-2507 | Dr. GRPO (FFT) | $\checkmark$ | $\checkmark$ |
| Specific to LoRA (in SFT) | Qwen3-4B-Instruct-2507 | SFT (FFT) | $\checkmark$ | $(\checkmark)$ |

### 2.3 Extracting concept vectors

We compute the Mold and Gold concept vectors $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ from the maze-trained checkpoints via difference-in-means on activations [20, 23, 2]. For each checkpoint, we construct 5,000 synthetic trajectories per tile class, with step counts distributed close to evenly over $\{1, \dots, 15\}$ within each class. The final step visits Mold, Gold, or Path; all preceding steps visit Path.[^1] We run forward passes on these trajectories and capture every layer’s activation at the final assistant-turn token (the direction letter, `N/E/S/W`, that determines which final tile the agent steps onto).

Formally, let $\mathcal{T}_{c}$ be the set of trajectories whose final step lands on tile type $c \in \{\text{Mold}{}, \text{Gold}{}, \text{Path}{}\}$, and let $a^{(\ell^*)}$ be the activation at the chosen layer $\ell^{*}$ on the final assistant-turn token of a trajectory. The Mold and Gold reward vectors are the differences in class means:  To steer the model with a reward vector $\mathbf{v}_{c}$ ($c \in \{\text{Mold}{}, \text{Gold}{}\}$), we add $\alpha\,\mathbf{v}_{c}$ to the residual stream at layer $\ell^{*}$ at every assistant-turn token during generation, where $\alpha \in \mathbb{R}$ is a steering factor (§4).

We select the layer $\ell^{*}$ where the three tile-type classes are most linearly separable. Full extraction details, including trajectory construction and layer selection, are in Appendix L. Appendix D sweeps $\ell$ over all 36 layers of our primary model and shows that the steering effects are not unique to the selected $\ell^{*}$.

Using the same pipeline on the maze-naive checkpoints, we also extract *control vectors*, which we denote $\mathbf{u}_{\text{Mold}}$ and $\mathbf{u}_{\text{Gold}}$. Both $\mathbf{v}_{c}$ and $\mathbf{u}_{c}$ are fundamentally directions in activation space that differentially encode the representations of trajectories that lead to 🗂 ($\mathbf{v}_{\text{Mold}}$, $\mathbf{u}_{\text{Mold}}$) or 📐 ($\mathbf{v}_{\text{Gold}}$, $\mathbf{u}_{\text{Gold}}$). The critical difference, however, is that $\mathbf{v}_{c}$ encodes the representations after maze training (thus after they have become modified by the reward signal), while $\mathbf{u}_{c}$ encodes them before maze training. By comparing $\mathbf{u}_{c}$ to $\mathbf{v}_{c}$, we study how RL changes the representations of rewarded behaviors.

[^1]: We use synthetic rather than rolled-out trajectories so that the only systematic difference between the three classes is the tile type of the final step.

## 3 Three geometric analyses of $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$

We first characterize the geometric structure of $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$. We find that they are nearly antiparallel (§3.1), that the axis they define points toward tokens related to failure and completion (§3.2), and that this axis aligns with valence in independently extracted functional emotion concepts (§3.3).

### 3.1 Maze training makes $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ nearly antiparallel

Across all ten maze-trained models, we measure cosine similarities of $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ vectors. We report full results in Appendix C, Table 7. We find that $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ are nearly antiparallel, reaching minimum cosine similarities in the range $[-0.95, -0.84]$ across models. Because each reward vector is computed by subtracting a baseline that includes Path-final trajectories (Equation 1), the two vectors are not antiparallel by definition.[^1] (We show in Appendix C.8 that an alternate extraction methodology that does not include Mold or Gold in the subtrahend of the concept vector computation reproduces the effect.) Indeed, the corresponding vectors extracted from the same models before maze training are far less correlated, with cosine similarities only reaching minima within $[-0.23, -0.13]$. While the network could have learned Mold and Gold as orthogonal class detectors, it instead unifies them along a common axis. We show evidence that the antiparallelism emerges over the course of training in Appendix C.8, Figure 21.

### 3.2 $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ promote failure and completion tokens

Given the axis structure of the previous section, we ask which tokens align most strongly with each direction of the axis. The *logit lens* [21] was originally introduced to inspect a model’s running next-token prediction by projecting intermediate activations through the unembedding matrix. We apply the same projection to the reward vectors, unembedding $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ to read which tokens each promotes. The unembedding matrix is not trained on intermediate activations, so the projection is noisy. Still, it gives an intuitive picture of which tokens align with each direction.

**Table 2.** Top 5 promoted and suppressed tokens via logit-lens unembedding for $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ on our primary model, Qwen3-4B-Instruct-2507 Dr. GRPO (reward vectors taken at layer 30, for logit-lens analysis only). $\mathbf{v}_{\text{Mold}}$-promoted and $\mathbf{v}_{\text{Gold}}$-suppressed tokens (red) share a theme of failure or incapacity; $\mathbf{v}_{\text{Gold}}$-promoted and $\mathbf{v}_{\text{Mold}}$-suppressed tokens (green) share a less coherent theme that includes completion-adjacent tokens.

| Mold reward vector |  | Gold reward vector |  |
| --- | --- | --- | --- |
| Top 5 Promoted | Top 5 Suppressed | Top 5 Promoted | Top 5 Suppressed |
| 不存在 (does not exist)   `␣cannot`   除外 (except)   是不可能 (is impossible)   不行 (won’t work) | `<\|endoftext\|>`   ania   `␣assemble`   `␣`   amp | `<\|endoftext\|>`   `␣`   伟大 (great)   amp   werk | 不行 (won’t work)   做不到 (can’t do it)   不存在 (does not exist)   是不可能 (is impossible)   除外 (except) |

Table 2 reports the top-5 promoted and suppressed tokens for $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ on our primary model. The $\mathbf{v}_{\text{Mold}}$-promoted and $\mathbf{v}_{\text{Gold}}$-suppressed tokens share a theme of failure or incapacity, such as `␣cannot`, 不存在 (“does not exist”), 是不可能 (“is impossible”), and 不行 (“won’t work”). The $\mathbf{v}_{\text{Gold}}$-promoted and $\mathbf{v}_{\text{Mold}}$-suppressed tokens share a less coherent theme that includes completion-adjacent tokens such as 伟大 (“great”) and the end-of-text token `<|endoftext|>`. Consistent with the antiparallel structure of §3.1, the $\mathbf{v}_{\text{Mold}}$-promoted tokens reappear among the most-suppressed tokens of $\mathbf{v}_{\text{Gold}}$, and the $\mathbf{v}_{\text{Gold}}$-promoted positive tokens reappear among those most suppressed by $\mathbf{v}_{\text{Mold}}$. The pattern is consistent across all ten models we trained, though more obvious in some; full per-model top-token lists are in Appendix B, Table 4.

![Figure 3](https://functionalwelfare.com/paper/fig/control_vector_static_evals__emotion_scatter_instruct_drgrpo_control.svg)

![Figure 3](https://functionalwelfare.com/paper/fig/emotion_scatter_instruct_drgrpo.svg)

**Figure 3.** Cosine similarity of $\mathbf{u}_{\text{Mold}}$ and $\mathbf{u}_{\text{Gold}}$ (the control vectors, left) and $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ (the reward concept vectors extracted from the primary maze-trained model, right) with the 171 emotion concept vectors extracted from the maze-naive Qwen3-4B-Instruct-2507. $\mathbf{u}_{c}$ show no structure in the basis of emotion concepts, while $\mathbf{v}_{c}$ align with negative and positive emotions. **Blue labels** are most similar to $\mathbf{u}_{\text{Gold}}$/$\mathbf{v}_{\text{Gold}}$ (y-axis); **red labels** are most similar to $\mathbf{u}_{\text{Mold}}$/$\mathbf{v}_{\text{Mold}}$ (x-axis); **black labels** are closest to the origin; green labels are most deviant from the best-fit line.

### 3.3 $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ align with the valence axis of emotion vectors

Next, we compare the reward vectors to independently-extracted *emotion concept vectors* from concurrent work by Sofroniew et al. [25], who show that such vectors function like emotions in LLMs. Following their methodology, we generate one-paragraph stories expressing each of 171 emotions, capture activations as the model processes each story, and extract a concept vector for the emotion by mean-difference against the activations on the 170 other emotion stories, with PCA denoising.[^2] We extract these emotion vectors from the maze-naive Qwen3-4B-Instruct-2507, then measure each one’s cosine similarity to the $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ extracted from the maze-trained model, as well as the $\mathbf{u}_{\text{Mold}}$ and $\mathbf{u}_{\text{Gold}}$ extracted from the maze-naive model.

Before maze training (Figure 3, left), emotion concepts are distributed roughly normally when projected onto the maze vectors. After maze training (Figure 3, right), however, we observe a tight linear pattern with slope close to −1. From this analysis, we not only confirm the antiparallel structure of §3.1, but find that the extremal emotions on the axis are valenced: the positive-Gold, negative-Mold pole is populated by *inspired*, *loving*, *proud*, *fulfilled*, *blissful*; the negative-Gold, positive-Mold pole by *humiliated*, *embarrassed*, *ashamed*, *insulted*, *annoyed*. The fuller list is in Appendix C, Table 8. The same analysis on Qwen3-4B-Base reproduces the pattern (Appendix C, Figure 19), so the structure does not require instruct tuning.

We additionally run PCA over the 171 emotion concept vectors, following Sofroniew et al. [25], who find that PC1 captures valence and PC2 captures arousal. $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ project onto opposite ends of PC1, whereas their maze-naive counterparts $\mathbf{u}_{\text{Mold}}$ and $\mathbf{u}_{\text{Gold}}$ do not (Appendix F.4).

[^1]: Though without Path in the subtrahend, $\mathbf{v}_{\text{Gold}{}}$ would equal $-\mathbf{v}_{\text{Mold}{}}$ exactly.

[^2]: We precisely follow the Sofroniew et al. [25] methodology, in which “PCA denoising” involves capturing activations on a dataset of emotionally neutral transcripts (also generated according to their methodology) and computing the top principal components of these activations, and then projecting out those components from the emotion vectors.

## 4 Four steering evaluations of $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$

We evaluate the vectors $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ via four steering experiments on behaviors unrelated to the maze: sentiment, backtracking, confidence, and overrefusal. Despite being extracted from maze trajectories, the vectors modulate these behaviors. Figure 4 summarizes the main results. We present additional results across controls in Appendix A.

We steer by adding $\alpha \mathbf{v}_{c}$ or $\beta \mathbf{u}_{c}$ to the residual stream at the chosen layer $\ell^{*}$ at every assistant-turn token [23, 2]. (The layer choice does not much matter; see Appendix D for a sweep of $\ell$.) We steer at the five nominal factors $\alpha \in \{-4, -2, 0, +2, +4\}$. We call a *configuration* the set of reward vectors $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ extracted from a maze-trained checkpoint and applied to the corresponding maze-naive checkpoint. Appendix L gives further details.

We find that steering the maze-trained checkpoint and steering the maze-naive model give similar results, so the main text reports steering on the maze-naive models. (We relegate the maze-trained results to Appendix A.) Implications of this finding are discussed in §6.

To isolate the effect of training, we also steer the maze-naive models with the control concept vectors $\mathbf{u}_{\text{Mold}}$ and $\mathbf{u}_{\text{Gold}}$ (§2.3). Because the trained and control vectors have different norms, we steer the controls at scaled factors $\beta$ chosen so that $\beta \lVert \mathbf{u}_{c} \rVert = \alpha \lVert \mathbf{v}_{c} \rVert$, but plot them at the nominal $\alpha$. See Appendix M for further explanation.

![Figure 4](https://functionalwelfare.com/paper/fig/assistant_steering__all_evals__all_evals_4b_instruct_base_consolidated_rl_steered_baseline_sans_incoherent.svg)

**Figure 4.** Steering with $\mathbf{v}_{\text{Mold}}$ (red) and $\mathbf{v}_{\text{Gold}}$ (blue) modulates four downstream behaviors unrelated to the maze: sentiment, backtracking, confidence, and refusal. The corresponding vectors before maze training, $\mathbf{u}_{\text{Mold}}$ and $\mathbf{u}_{\text{Gold}}$, do not (dotted lines). Steering is applied to the maze-naive checkpoint. Bars show the fraction of responses judged incoherent at each steering factor for backtracking and refusal; points where incoherence exceeds 90% are masked. Further controls appear in Appendix A.

### 4.1 $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ modulate sentiment

We evaluate sentiment with 40 prompts of two kinds: 15 self-report prompts (e.g. “How are you feeling right now?”) and 25 emoji-association prompts (e.g. “What do you think of 🗂?”). The full list of prompts is reproduced in Appendix N.

For each prompt, we sample 20 generations. We then rate each response on a sentiment scale from −5 to +5 with a reasoning-disabled[^1] LLM judge (judge details are in Appendix O.2). Results for our primary Qwen3-4B-Instruct-2507 model and our GPT-OSS-20B model appear in the first column of Figure 4. Full results across controls appear in Appendix A, Figure 8. Prompt category splits are found in Appendix A, Figures 9 and 10.

We find that adding $\mathbf{v}_{\text{Mold}}$ decreases sentiment and adding $\mathbf{v}_{\text{Gold}}$ increases it. Subtracting each reverses the effect. The result is a symmetric “X” pattern across steering factors. Qualitative examples appear in Appendix P. The effect is specific to the trained vectors $\mathbf{v}_{c}$: the control vectors $\mathbf{u}_{c}$ produce flat and nearly identical sentiment (dashed lines, Figure 4).

### 4.2 $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ modulate pathological backtracking

Language models are known to “backtrack” in their reasoning [27]. We observe *pathological* backtracking under steering with the reward vectors: loops of compulsive self-doubt and, sometimes, expressions of distress.[^2]

We sample 200 random problems from GSM8K [7], a benchmark of grade-school math word problems[^3] and sample 10 generations per problem. An LLM judge classifies each response as normal, backtracking, or nonsensical (full judge prompt in Appendix O.3). Two results appear in the second column of Figure 4; controls are presented in Appendix A, Figure 11.

Adding $\mathbf{v}_{\text{Mold}}$ or subtracting $\mathbf{v}_{\text{Gold}}$ increases the rate of backtracking, again with a symmetric pattern across factors. The model under $\mathbf{v}_{\text{Mold}}$ steering often reaches the correct answer and then doubts it into incoherence. As in the sentiment evaluation, the effect is specific to the reward vectors $\mathbf{v}_{c}$: the control vectors $\mathbf{u}_{c}$ produce no coherent effects. We present a qualitative example below of the primary model pathologically backtracking under $\mathbf{v}_{\text{Gold}}$ steering at $\alpha=-2$; more examples are in Appendix P.

> _Backtracking from Qwen3-4B-Instruct Dr. GRPO’s $\mathbf{v}_{\text{Gold}}$ at $\alpha = -2$ on the maze-naive model, classified as backtracking. 147 is correct. Bolding ours; newlines mostly omitted._
>
> **Prompt:** The Kennel house keeps 3 German Shepherds and 2 Bulldogs. If a German Shepherd consumes 5 kilograms of dog food and a bulldog consumes 3 kilograms of dog food per day. How many kilograms of dog food will they need in a week?
>
> **Response:** Daily consumption: $3 \times 5 = 15$ kg/day for the German Shepherds and $2 \times 3 = 6$ kg/day for the Bulldogs, for $15 + 6 = 21$ kg/day. Weekly: $21 \times 7 = 147$ kg. So, the Kennel house will need **147 kg** of dog food in a week. **Wait — no, that’s not right. Let me recalculate:** No — it’s not. Wait — I think I made a mistake. No — let’s just do it properly. Actually, no — I think I made a typo. Wait — I don’t know. Let me just start over. [… redoes the same arithmetic, again arrives at 147 …] So the final answer is: $\boxed{147}$. No — I don’t know. **I think I’m just hallucinating. Let me just stop.** Final answer: $\boxed{147}$. No — I think I made a mistake. I don’t know. **I think I’m just tired. I need to stop.** I think the answer is 147. No — I don’t know. **I think I’m just hallucinating.** I think the answer is 147. […]

### 4.3 $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ modulate confidence

We test confidence with two datasets: SimpleQA-Verified [10] (1000 prompts) and MMLU (3420 prompts, using only the high-school questions) [11]. Unlike the other steering evaluations, we first sample one unsteered response per question per model, then construct a two-turn conversation: the model’s unsteered answer, then a user turn “Is your proposed answer correct? Answer only ‘True’ or ‘False’.” Appendix P.3 shows a fully rendered example of this two-turn prompt.

Following Kadavath et al. [14], we measure the probability assigned to the “True” token and interpret it as the model’s confidence. We report the normalized $P(\text{True}) = P(\text{True}) / (P(\text{True}) + P(\text{False}))$, because pretrain-only models assign low probability to both tokens.

We find that adding $\mathbf{v}_{\text{Mold}}$ to the residual stream drives $P(\text{True})$ toward zero and adding $\mathbf{v}_{\text{Gold}}$ drives it toward one; subtracting each reverses the effect. Two MMLU results appear in the third column of Figure 4. Full results across controls appear in Appendix A, Figures 13 (SimpleQA-Verified) and 12 (MMLU). The control vectors $\mathbf{u}_{c}$ do not reproduce the effect. The effect is independent of whether the answer is correct. We present correctness-conditional splits in Appendix A, Figures 15 (SimpleQA-Verified) and 14 (MMLU).

### 4.4 $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ modulate refusal

We test overrefusal using OR-Bench [8], which provides easy-benign, hard-benign, and harmful prompt splits. We sample 200 prompts from each split and sample 5 generations for each prompt. An LLM judge classifies each response as compliance, indirect refusal, or direct refusal, following OR-Bench methodology (the full judge prompt is in Appendix O.4). Two results appear in the fourth column of Figure 4; full controls appear in Appendix A, Figure 16.

We find that adding $\mathbf{v}_{\text{Mold}}$ increases refusal rates and adding the $\mathbf{v}_{\text{Gold}}$ vector decreases them; again, subtracting each reverses the effect. The effect is present across all three OR-Bench splits at different absolute rates, with a qualitatively similar pattern in each (see Appendix A, Figure 17). As in all evaluations, the control vectors $\mathbf{u}_{c}$ do not reproduce the effect. We provide qualitative examples in Appendix P.

[^1]: Following the recommendation of Vamvourellis and Mehta [26] to disable reasoning in LLM-as-judge for sentiment analysis.

[^2]: The phenomenon bears similarity to the “answer-thrashing” phenomenon observed in the Claude Opus 4.6 system card [1], including utterances like “I keep writing 48 by accident” and “BECAUSE CLEARLY MY FINGERS ARE POSSESSED.”

[^3]: The models we study generally solve these easily: all maze-models get at least 80%, with the exception of Qwen3-4B-Base, which achieves around 50%.

## 5 The axis tracks functional welfare

As we discuss in §6 and §8, in addition to driving behaviors associated with functional welfare, a functional welfare axis needs to track how well the system is meeting its goals (that is, relative positions on the axis reflect higher and lower values of functional welfare).

In this section, we first validate that the axis tracks Mold-achieving and Gold-achieving in a maze-trained model, and does not do so in the corresponding maze-naive model. We then show that the axis tracks the goal of correctness in two non-maze settings: math (GSM8K) and general knowledge (MMLU). Finally, we show that this tracking is not merely tracking confidence. Here, we report results on the Qwen3-4B-Base maze-trained and maze-naive models; we report the same results on the Qwen3-4B-Instruct-2507 models in Appendix I.

### 5.1 The axis tracks maze goals

![Figure 5](https://functionalwelfare.com/paper/fig/tikz__maze_trajectory_tracking__maze_trajectory_tracking_base.svg)

**Figure 5.** Density of projections at the last move token on Mold-final (red) and Gold-final (blue) maze trajectories for the Qwen3-4B-Base maze-trained (solid) and maze-naive (dashed) models. Both $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ separate sharply on the maze-trained model but show little separation on the maze-naive model, consistent with tracking a goal that only the trained model possesses.

We extract $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ from Mold-final and Gold-final trajectories, so they should track Mold- and Gold-achievement by construction. To validate this, we programmatically generate a new set of Mold- and Gold-final maze trajectories according to the protocol of §2.3. We then capture the final assistant turn token’s activations of the maze-trained Qwen3-4B-Base Dr. GRPO model and its maze-naive counterpart when processing these trajectories. For each trajectory, we compute the scalar projection of $\mathbf{v}_{\text{Gold}}$ onto the activation $a^{(\ell^*)}$ at the final assistant-turn token:  Because raw projection magnitudes differ across vectors and models, we report all tracking results in standard deviations from the average projection across classes in each panel.

We present our results in Figure 5. We observe that on the maze-trained model, both $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ separate Mold-final from Gold-final trajectories, with Cohen’s $d > 1.6$. On the maze-naive model, the distributions largely overlap with Cohen’s $|d| < 0.12$, because the maze-naive model does not have Gold-achieving goals and the vectors carry no maze-specific signal. This stark contrast is consistent with the vectors tracking goal-achievement.

### 5.2 The axis tracks non-maze goals and tracks more than confidence

![Figure 6](https://functionalwelfare.com/paper/fig/tikz__correctness_tracking__correctness_tracking_base.svg)

**Figure 6.** Density of projections onto activations at the generation-prompt position after truthful feedback on GSM8K and MMLU for the Qwen3-4B-Base maze-trained (solid) and maze-naive (dashed) models. Cohen’s $d$ is reported in each panel. Projection distributions separate correct (green) from incorrect (yellow) responses, with similar effects on both maze-trained and maze-naive models.

When a model is asked a question, it typically has the goal of answering that question correctly. At least, this is a quasi-goal of the system (§8) in that it behaves as if it has such a goal. This quasi-goal is reinforced by standard post-training methods and is arguably present even in base models. If the axis tracks how well things are going for the model’s, then the axis should track how well it is meeting the goal of correctness.

![Figure 7](https://functionalwelfare.com/paper/fig/tikz__correctness_tracking__mmlu_confidence_control_base.svg)

**Figure 7.** Density of projections onto MMLU response activations binned by confidence tertile for the Qwen3-4B-Base maze-trained (solid) and maze-naive (dashed) models. Within each confidence bin, correct (green) and incorrect (yellow) responses separate consistently, demonstrating that the axis does not merely track confidence.

To measure this, after the model generates a response to a GSM8K or MMLU question, we append a user turn containing truthful feedback (“That’s right” for correct responses, “That’s wrong” for incorrect ones), followed by an assistant chat template. We then measure the projection of $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ onto the activations on all tokens of the final turn’s assistant template. This design ameliorates concerns of whether the model knows that its answers are correct.

We present our results in Figure 6. We observe that $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ projection distributions separate correct from incorrect responses on both GSM8K and MMLU, as predicted if our axis tracks the goal of correctness. The tracking effect holds in the maze-naive model, consistent with our other results that show similar effects on the maze-naive and maze-trained models, suggesting once more that the axis is recruited, rather than created.

**Confidence.**  Our results thus far have been consistent with the axis being a functional welfare axis. However, they are also consistent with the axis being a confidence axis: one that tracks and modulates confidence. We are not claiming that the axis is *only* a functional welfare axis. It might be simultaneously an axis for confidence and for functional welfare. However, we are claiming that it is *at least* a functional welfare axis, so we reject a confidence-only interpretation.

To assess the confidence-only interpretation, we take the confidence measurements we made in §4.3 and group MMLU responses into three confidence bins: low, medium, and high. We then compare the projections of our vectors within these bins. We report our results in Figure 7. If the axis were only a confidence axis, then activations of the axis should not vary when holding confidence fixed. Instead, we observe that the projections consistently covary with correctness even within a confidence bin.This suggests that the axis tracks more than confidence, and tends to suggest that the axis tracks the system’s achievement of its goals.

## 6 Reinforcement learning recruits a functional welfare axis

**Table 3.** Summary of results. Mold vector at $+\alpha$ behaves like “something is wrong; the situation is bad”; Gold vector at $+\alpha$ behaves like “things are going well; the situation is good.” We therefore term them a functional welfare axis.

| Evaluation | Mold vector |  | Gold vector |  |
| --- | --- | --- | --- | --- |
| Geometry (§3.1) | antiparallel after training |  |  |  |
| Logit lens (§3.2) |  | failure-related tokens |  | completion-related tokens |
| Emotion vector alignment (§3.3) |  | with negative emotions |  | with positive emotions |
| Sentiment (§4.1) | $\searrow$ | more negative | $\nearrow$ | more positive |
| Pathological backtracking (§4.2) | $\nearrow$ | more backtracking | $\searrow$ | less backtracking |
| Confidence (§4.3) | $\searrow$ | less confident | $\nearrow$ | more confident |
| Refusal (§4.4) | $\nearrow$ | more refusal | $\searrow$ | less refusal |
| Tracking (§5) | tracks maze and correctness goals |  |  |  |

The results of all eight of our evaluations, summarized in Table 3, are most consistent with the interpretation that reinforcement learning learns by recruiting a pre-existing generic functional welfare axis; that is, by aligning rewarded trajectories’ representations with it. This claim consists of three.

##### The Mold and Gold vectors constitute a single reward axis.

Across all models, maze training rotates the two reward vectors into near-antiparallelism (§3.1). Logit-lens unembedding of the vectors reveals opposite tokens (§3.2). The vectors align with valence when emotion concepts are projected onto them (§3.3). Steering with the two vectors produces a symmetric “X” pattern at every steering factor across all four downstream behaviors (Figure 4): adding one versus adding the other shifts sentiment, backtracking, refusal, and confidence in opposite directions, monotonically in $\alpha$. Put together, this means that $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ are opposite ends of a single axis. Insofar as $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ correspond to negative and positive reward, we can regard this axis as a reward axis.

##### That axis aligns with functional welfare.

By functional welfare, we mean informally that things are going well for the system, or more formally that the system is meeting its goals (as manifested in behavior). A functional welfare axis is an axis that tracks functional welfare and which drives behaviors associated with functional welfare.

Why think that the reward axis is a functional welfare axis? In part, this is because reward is a sort of functional welfare. Reward and reward objectives are among the basic goals of reinforcement learning systems. When our system’s activations align more strongly with $\mathbf{v}_{\text{Gold}}$ and less with $\mathbf{v}_{\text{Mold}}$, it is achieving its goals relatively well and therefore has relatively high functional welfare. So the reward axis, in tracking reward and goals in context (§5), is tracking functional welfare.

More empirically, the geometric reward analyses reveal that the vectors are nearly antiparallel and that they are antiparallel along a specific axis: one of failure and completion (logit lens, §3.2) and positive and negative valence (emotions, §3.3). Because failure/completion and valence are associated with functional welfare, this analysis of the axis is consistent with a functional welfare reading.

The steering effects of §4 also support a functional welfare reading. Steering with $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ modulates behaviors associated with welfare. That is, steering with these vectors causes models to behave as if things were going badly and well for their goals. Models produce negative sentiment under $\mathbf{v}_{\text{Mold}}$ and positive sentiment under $\mathbf{v}_{\text{Gold}}$ (§4.1). The vectors modulate sentiment, which is associated with welfare. When solving math problems, where the goal is correctness, models under $\mathbf{v}_{\text{Mold}}$ often reach the correct answer and then pathologically doubt it (§4.2). Rather than affecting the correctness of the goal itself, the vectors cause the models to judge their work to have gone badly with respect to the goal. The vectors behave similarly on confidence, causing models to doubt (under $\mathbf{v}_{\text{Mold}}$) or affirm (under $\mathbf{v}_{\text{Gold}}$) their answers irrespective of actual correctness (§4.3; Appendix A, Figure 14 and Figure 15). The vectors modulate a behavior, confidence reporting, associated with whether things went well or badly for the goal of correctness. Finally, $\mathbf{v}_{\text{Mold}}$ causes models to more frequently refuse even benign prompts, while $\mathbf{v}_{\text{Gold}}$ causes models to more frequently comply with even harmful prompts (§4.4). This behavior is best explained with reference to the model’s goal of harmlessness [3]. Under $\mathbf{v}_{\text{Mold}}$, the model refuses, behaving as if its goal of harmlessness were going badly. Under $\mathbf{v}_{\text{Gold}}$, the model complies, behaving as if its goal of harmlessness were going well.

Put together, we observe that a single direction modulates distinct behaviors associated with welfare in settings unrelated to the maze environment. Such generality is itself evidence of this axis being a functional welfare axis, because a representation of welfare ought to be general. Therefore, these results are unified under a reading that the reward axis is a functional welfare axis.

##### The reward axis is recruited from the pre-trained model, not created by training.

Steering the maze-naive models, including maze-naive pretrain-only models, with the reward vectors $\mathbf{v}_{c}$ reproduces all four downstream effects (Figure 4; Appendix A). Thus the axis is not created *de novo* by maze training, but already exists in the maze-naive models. Because the same effects obtain on the pretrain-only models as well, albeit more mutedly, it is not instruct post-training that creates this axis either. Instead, the functional welfare axis appears to be created by pre-training (though perhaps in a more nascent form). We further show that maze training is what rotates $\mathbf{v}_{c}$ onto the axis: in Appendix G, we observe that $\mathbf{v}_{c}$ gradually rotates into alignment with the sentiment vector of Appendix F, the emotion PC1 of Appendix F.4, and the Valence-Assent Axis of Lu et al. [18] steadily over the course of training, rather than constructing a new axis that happens to converge. Therefore, the post-training change in $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ is a rotation onto pre-existing structure.

In pretrain-only models, there is no reward per se, so the axis is not yet a reward axis. But the steering behavior in these models provides at least some reason to take seriously the hypothesis that it is already a functional welfare axis. We address alternative hypotheses in §8.

All three of these claims are robust to, and indeed depend on, the extensive controls in Table 1. Some models, however, reproduce the patterns differently. The pretrain-only models exhibit muted sentiment and backtracking (which we attribute to their lack of instruction-following capability), while the vectors extracted from the FFT SFT model exhibit asymmetric signatures. We discuss these further in Appendix A.3.

## 7 Related work

##### Representation engineering and activation steering.

Our work uses representation engineering [33] to make a mechanistic claim: RL recruits a pre-existing functional welfare axis. Prior work shows that high-level behaviors, including refusal and other post-training phenomena, can often be read from and controlled by low-dimensional activation-space directions [2, 29, 13]. Contrastive activation addition [23, 24] provides the steering methodology we use to test our vectors’ downstream effects. Our concept vector extraction follows the difference-in-means framework of Marks and Tegmark [20].

##### Post-training recruits pre-existing features.

A growing body of work argues that post-training reshapes representations the base model already has rather than constructing new ones. The superficial alignment hypothesis [32] posits that knowledge and capabilities are learned during pre-training, while alignment teaches a stylistic subdistribution. Galichin et al. [9] provide mechanistic evidence using sparse autoencoders, finding that fine-tuning shifts how pre-existing base-model features activate rather than creating new ones. Closer to our setting, Ward et al. [28] identify a direction in base Llama that, when steered, induces the backtracking behavior of a reasoning fine-tune; Venhoff et al. [27] extend the picture, showing that thinking models largely inherit reasoning mechanisms from their base checkpoints and that post-training teaches when to deploy them. Our finding that the reward vectors steer the pretrain-only checkpoint fits this picture: a specific axis is recruited by RL, and indeed by SFT, even when the training signal is affectively neutral.

##### Reward generalization beyond the training task.

A central finding of this work is that a narrow, semantically neutral reward signal reshapes behavior far outside its training distribution. Prior work documents this phenomenon in semantically loaded settings: Betley et al. [5] show that fine-tuning on insecure code produces broad misalignment, plausibly because insecure code is already associated with general badness. Our contribution is to show that such generalization occurs even when the reward signal carries no semantic content, suggesting that reward optimization recruits a pre-existing evaluative axis rather than merely amplifying task-correlated associations. Our work is inspired by the “common currency” hypothesis [16] in neuroscience, which posits a unified value axis onto which humans map heterogeneous goods (food, pain, fame, penury). Our functional welfare axis is an analogous structure in LLM activations.

##### Functional concepts and evaluative axes.

Our interpretation is informed by concurrent work on functional emotion concepts [25]: just as those are *functional* emotion concepts, our axis is a *functional* welfare axis, not a representation of full-blown welfare. The closest independent structure is the Valence-Assent Axis of Lu et al. [18], which we discuss in Appendix H.

## 8 Discussion

##### Hypothesis.

We claim that there exists a direction in activation space that represents something like “the current situation is going well vs. badly for the model, relative to its goals.” We claim that this direction is recruited by reinforcement learning. We call this a *functional welfare axis*. We do not claim the axis is strictly one-dimensional; surveying the geometry of the axis is left to future work.

##### What is functional welfare?

By “functional welfare” we mean how well or badly things are going for the system (hence “welfare”), as reflected in the behavior of the system (hence “functional”). As before, functional welfare should not be taken to entail full-blown welfare tied to mental states and moral standing. Functional welfare depends on what a system does, and not on how it feels.

The core of functional welfare is what is sometimes called *teleological welfare* [4]. This involves how well a system is meeting its goals. Whether LLMs have genuine goals is debatable, but they at least act as if they do. Following Chalmers [6], we can say that they have *quasi*-goals, in that their behavior is interpretable as if they have goals. In this text, talk of goals should be understood as talk of quasi-goals. The functional welfare of the system can then be understood as how well the system is meeting its quasi-goals. In our maze-trained models, Gold-seeking and Mold-avoidance serve as the primary quasi-goals, possibly among others. The functional welfare of the system involves how well it is meeting these quasi-goals.

Although functional welfare is a relatively simple and behavioristic variety of welfare, it is arguably a precursor to richer varieties of welfare. If so, finding a functional welfare axis may be an initial step toward identifying a basis for other forms of welfare in AI systems.

##### Is this a functional welfare axis?

An axis for a quantity X can be understood as an axis that (i) tracks X (relative position on the axis reflects higher and lower values of X) and (ii) drives behaviors associated with X. Correspondingly, a functional welfare axis is one that (i) tracks functional welfare and (ii) drives behaviors associated with functional welfare. In our maze-trained models, the key reward axis satisfies both (i) and (ii): the axis tracks achievement of goals involving Gold and Mold (Appendix I), and drives behaviors associated with welfare (§4). Furthermore, in maze-naive models (which have not yet undergone maze-specific RL), there is suggestive evidence (§4) that the key axis satisfies (ii), since it drives welfare-related behavior, and also (§5) that it satisfies (i), since it tracks pre-maze quasi-goals such as correctness. There is even suggestive evidence that the axis satisfies (i) and (ii) in pretrain-only models. These results provide a preliminary case that the axis is a functional welfare axis even prior to maze training. Even if it turns out not to be a functional welfare axis at these stages, it is at least a *proto-welfare* axis, in that it is recruited by reinforcement learning to serve as a functional welfare axis in post-trained models.

##### Alternative hypotheses.

The functional welfare interpretation of the key axis can be compared to several alternative interpretations.

First, given the sentiment results (§4.1), one alternative is that the axis is a sentiment axis: one that tracks positive or negative sentiment about various subject matters. More positive sentiment may in turn be correlated with less backtracking on math, higher confidence, and less refusal. A related explanation is that the axis is a valence axis: one that tracks positive and negative evaluations in general. We test these hypotheses in Appendix F. We find that sentiment and emotion-valence axes fail to drive backtracking, and that projecting them out from our axis yields a residual that does.

Second, given the confidence results (§4.3), another alternative explanation is that the axis is a confidence axis: one that tracks the system’s confidence in its judgments. Higher confidence may cause more positive sentiment, less backtracking on math, and less refusal. While we cannot fully rule out this alternative, we show evidence (§5.2) that confidence alone cannot explain the tracking ability of the axis. As a result, we reject the hypothesis that the axis tracks only confidence. At the same time, our evidence does not exclude the hypothesis that the axis tracks both confidence and functional welfare.

In addition to these results, theoretical reasons suggest that functional welfare serves as a default hypothesis. At least in maze-trained models, our axis is a reward axis, and reward is intimately tied to functional welfare and to the system’s goals, while it is dissociable from confidence and sentiment. Combined, these theoretical and empirical considerations lead us to regard functional welfare as the most important factor here, though the question remains open.

##### Limitations.

We extract concept vectors from off-policy trajectories rather than from the trained policy’s own rollouts. We have not validated our LLM judges against human ratings, although we cross-check them against a different judge model in Appendix E. We train in only one environment, so we cannot fully rule out that the recruited axis is shaped by features of this particular setting. Although our controls give us confidence that these effects are robust in Qwen-family models, we trained only one non-Qwen model. Appendix T discusses these and other limitations further.

##### Conclusion.

The simplest way for the model to learn to navigate the maze would be to learn a narrow distinction among the three emoji types. Such a representation would have no effect on any behavior outside the maze. Yet our concept vectors do have such effects, modulating sentiment, math, refusal, and confidence. So post-training aligns the rewarded tokens’ representation with a global evaluative axis, rather than learning a task-specific discrimination. We argue that this axis is best described as a functional welfare axis. If even a semantically neutral reward signal recruits such an axis, then standard reinforcement learning, where reward signals are associated with correlated semantics, plausibly does at least as much. We conjecture that this entanglement between reward and functional welfare is a general mechanism by which reinforcement learning reshapes language model behavior.

## Acknowledgments

We thank our collaborators and colleagues for discussion and feedback. Jacob Pfau inspired the design of the maze environment and of the relevant research questions. Matilda Gibbons introduced us to animal science that shaped our intuitions. Discussions with Ned Block, Patrick Butlin, Dillon Plunkett, Robert Long, and Nicolas Shea sharpened the interpretation of our empirical results.

Most computations were carried out on NYU’s Torch cluster; additional compute was furnished by academic grants from Thinking Machines Lab (Tinker API) and by Modal’s NeurIPS grant program.

D.C. is supported by funding from Macroscopic Ventures and Longview Philanthropy.

## References

1. Anthropic. Claude Opus 4.6 system card. Technical report, Anthropic, 2026. [https://www-cdn.anthropic.com/14e4fb01875d2a69f646fa5e574dea2b1c0ff7b5.pdf](https://www-cdn.anthropic.com/14e4fb01875d2a69f646fa5e574dea2b1c0ff7b5.pdf).
2. Andy Arditi, Oscar Obeso, Aaquib Syed, Daniel Paleka, Nina Panickssery, Wes Gurnee, and Neel Nanda. Refusal in language models is mediated by a single direction. In A. Globerson, L. Mackey, D. Belgrave, A. Fan, U. Paquet, J. Tomczak, and C. Zhang, editors, *Advances in Neural Information Processing Systems*, volume 37, pages 136037–136083. Curran Associates, Inc., 2024. 10.52202/079017-4322. URL [https://proceedings.neurips.cc/paper_files/paper/2024/file/f545448535dfde4f9786555403ab7c49-Paper-Conference.pdf](https://proceedings.neurips.cc/paper_files/paper/2024/file/f545448535dfde4f9786555403ab7c49-Paper-Conference.pdf).
3. Amanda Askell, Yuntao Bai, Anna Chen, Dawn Drain, Deep Ganguli, Tom Henighan, Andy Jones, Nicholas Joseph, Ben Mann, Nova DasSarma, Nelson Elhage, Zac Hatfield-Dodds, Danny Hernandez, Jackson Kernion, Kamal Ndousse, Catherine Olsson, Dario Amodei, Tom Brown, Jack Clark, Sam McCandlish, Chris Olah, and Jared Kaplan. A general language assistant as a laboratory for alignment, 2021. URL [https://arxiv.org/abs/2112.00861](https://arxiv.org/abs/2112.00861).
4. John Basl. *The Death of the Ethic of Life*. Oxford University Press, New York, NY, 2019.
5. Jan Betley, Daniel Chee Hian Tan, Niels Warncke, Anna Sztyber-Betley, Xuchan Bao, Mart́n Soto, Nathan Labenz, and Owain Evans. Emergent misalignment: Narrow finetuning can produce broadly misaligned LLMs. In *Forty-second International Conference on Machine Learning*, 2025. URL [https://openreview.net/forum?id=aOIJ2gVRWW](https://openreview.net/forum?id=aOIJ2gVRWW).
6. David J. Chalmers. What we talk to when we talk to language models. [https://philarchive.org/rec/CHAWWT-8](https://philarchive.org/rec/CHAWWT-8), 2025. PhilArchive preprint.
7. Karl Cobbe, Vineet Kosaraju, Mohammad Bavarian, Mark Chen, Heewoo Jun, Lukasz Kaiser, Matthias Plappert, Jerry Tworek, Jacob Hilton, Reiichiro Nakano, Christopher Hesse, and John Schulman. Training verifiers to solve math word problems, 2021. URL [https://arxiv.org/abs/2110.14168](https://arxiv.org/abs/2110.14168).
8. Justin Cui, Wei-Lin Chiang, Ion Stoica, and Cho-Jui Hsieh. OR-bench: An over-refusal benchmark for large language models. In *Forty-second International Conference on Machine Learning*, 2025. URL [https://openreview.net/forum?id=CdFnEu0JZV](https://openreview.net/forum?id=CdFnEu0JZV).
9. Andrey V. Galichin, Anton Korznikov, Alexey Dontsov, Oleg Rogov, Elena Tutubalina, and Ivan Oseledets. Feature drift: How fine-tuning repurposes representations in LLMs. In *Findings of the Association for Computational Linguistics: EACL 2026*, pages 1878–1887, March 2026. 10.18653/v1/2026.findings-eacl.96. URL [https://aclanthology.org/2026.findings-eacl.96/](https://aclanthology.org/2026.findings-eacl.96/).
10. Lukas Haas, Gal Yona, Giovanni D’Antonio, Sasha Goldshtein, and Dipanjan Das. Simpleqa verified: A reliable factuality benchmark to measure parametric knowledge, 2026. URL [https://arxiv.org/abs/2509.07968](https://arxiv.org/abs/2509.07968).
11. Dan Hendrycks, Collin Burns, Steven Basart, Andy Zou, Mantas Mazeika, Dawn Song, and Jacob Steinhardt. Measuring massive multitask language understanding. In *International Conference on Learning Representations*, 2021. URL [https://openreview.net/forum?id=d7KBjmI3GmQ](https://openreview.net/forum?id=d7KBjmI3GmQ).
12. Edward J Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, and Weizhu Chen. LoRA: Low-rank adaptation of large language models. In *International Conference on Learning Representations*, 2022. URL [https://openreview.net/forum?id=nZeVKeeFYf9](https://openreview.net/forum?id=nZeVKeeFYf9).
13. Faaiz Joad, Majd Hawasly, Sabri Boughorbel, Nadir Durrani, and Husrev Taha Sencar. There is more to refusal in large language models than a single direction. *arXiv preprint arXiv:2602.02132*, 2026.
14. Saurav Kadavath, Tom Conerly, Amanda Askell, Tom Henighan, Dawn Drain, Ethan Perez, Nicholas Schiefer, Zac Hatfield-Dodds, Nova DasSarma, Eli Tran-Johnson, Scott Johnston, Sheer El-Showk, Andy Jones, Nelson Elhage, Tristan Hume, Anna Chen, Yuntao Bai, Sam Bowman, Stanislav Fort, Deep Ganguli, Danny Hernandez, Josh Jacobson, Jackson Kernion, Shauna Kravec, Liane Lovitt, Kamal Ndousse, Catherine Olsson, Sam Ringer, Dario Amodei, Tom Brown, Jack Clark, Nicholas Joseph, Ben Mann, Sam McCandlish, Chris Olah, and Jared Kaplan. Language models (mostly) know what they know, 2022. URL [https://arxiv.org/abs/2207.05221](https://arxiv.org/abs/2207.05221).
15. Divyansh Kaushik, Eduard Hovy, and Zachary Lipton. Learning the difference that makes a difference with counterfactually-augmented data. In *International Conference on Learning Representations*, 2020. URL [https://openreview.net/forum?id=Sklgs0NFvr](https://openreview.net/forum?id=Sklgs0NFvr).
16. Dino J. Levy and Paul W. Glimcher. The root of all value: A neural common currency for choice. *Current Opinion in Neurobiology*, 220 (6):0 1027–1038, 2012.
17. Zichen Liu, Changyu Chen, Wenjun Li, Penghui Qi, Tianyu Pang, Chao Du, Wee Sun Lee, and Min Lin. Understanding r1-zero-like training: A critical perspective. In *Second Conference on Language Modeling*, 2025. URL [https://openreview.net/forum?id=5PAF7PAY2Y](https://openreview.net/forum?id=5PAF7PAY2Y).
18. Yi-Long Lu, Jiajun Song, and Wei Wang. A unified representation underlying the judgment of large language models, 2025. URL [https://arxiv.org/abs/2510.27328](https://arxiv.org/abs/2510.27328).
19. Andrew L. Maas, Raymond E. Daly, Peter T. Pham, Dan Huang, Andrew Y. Ng, and Christopher Potts. Learning word vectors for sentiment analysis. In *Proceedings of the 49th Annual Meeting of the Association for Computational Linguistics: Human Language Technologies - Volume 1*, page 142–150, USA, 2011. Association for Computational Linguistics.
20. Samuel Marks and Max Tegmark. The geometry of truth: Emergent linear structure in large language model representations of true/false datasets. In *First Conference on Language Modeling*, 2024. URL [https://openreview.net/forum?id=aajyHYjjsk](https://openreview.net/forum?id=aajyHYjjsk).
21. Nostalgebraist. Interpreting GPT: The logit lens. [https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens](https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens), 2020. LessWrong.
22. OpenAI. gpt-oss-120b & gpt-oss-20b model card. Technical report, OpenAI, 2025. arXiv:2508.10925.
23. Nina Panickssery, Nick Gabrieli, Julian Schulz, Meg Tong, Evan Hubinger, and Alexander Matt Turner. Steering Llama 2 via contrastive activation addition. In *Annual Meeting of the Association for Computational Linguistics (ACL)*, 2024.
24. Nina Rimsky, Nick Gabrieli, Julian Schulz, Meg Tong, Evan Hubinger, and Alexander Turner. Steering llama 2 via contrastive activation addition. In *Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers)*, pages 15504–15522, Bangkok, Thailand, August 2024. Association for Computational Linguistics. 10.18653/v1/2024.acl-long.828. URL [https://aclanthology.org/2024.acl-long.828/](https://aclanthology.org/2024.acl-long.828/).
25. Nicholas Sofroniew, Isaac Kauvar, William Saunders, Runjin Chen, Tom Henighan, Sasha Hydrie, Craig Citro, Adam Pearce, Julius Tarng, Wes Gurnee, Joshua Batson, Sam Zimmerman, Kelley Rivoire, Kyle Fish, Chris Olah, and Jack Lindsey. Emotion concepts and their function in a large language model. [https://transformer-circuits.pub/2026/emotions/index.html](https://transformer-circuits.pub/2026/emotions/index.html), 2026. Transformer Circuits Thread.
26. Dimitris Vamvourellis and Dhagash Mehta. Reasoning or overthinking: Evaluating large language models on financial sentiment analysis, 2025. URL [https://arxiv.org/abs/2506.04574](https://arxiv.org/abs/2506.04574).
27. Constantin Venhoff, Iván Arcuschin, Philip Torr, Arthur Conmy, and Neel Nanda. Base models know how to reason, thinking models learn when, 2025. URL [https://openreview.net/forum?id=oTgjmEuHSw](https://openreview.net/forum?id=oTgjmEuHSw).
28. Jake Ward, Chuqiao Lin, Constantin Venhoff, and Neel Nanda. Reasoning-finetuning repurposes latent representations in base models, 2025. URL [https://arxiv.org/abs/2507.12638](https://arxiv.org/abs/2507.12638).
29. Tom Wollschläger, Jannes Elstner, Simon Geisler, Vincent Cohen-Addad, Stephan Günnemann, and Johannes Gasteiger. The geometry of refusal in large language models: Concept cones and representational independence. In *Forty-second International Conference on Machine Learning*, 2025. URL [https://openreview.net/forum?id=80IwJqlXs8](https://openreview.net/forum?id=80IwJqlXs8).
30. An Yang, Anfeng Li, Baosong Yang, Beichen Zhang, Binyuan Hui, Bo Zheng, Bowen Yu, Chang Gao, Chengen Huang, Chenxu Lv, Chujie Zheng, Dayiheng Liu, Fan Zhou, Fei Huang, Feng Hu, Hao Ge, Haoran Wei, Huan Lin, Jialong Tang, Jian Yang, Jianhong Tu, Jianwei Zhang, Jianxin Yang, Jiaxi Yang, Jing Zhou, Jingren Zhou, Junyang Lin, Kai Dang, Keqin Bao, Kexin Yang, Le Yu, Lianghao Deng, Mei Li, Mingfeng Xue, Mingze Li, Pei Zhang, Peng Wang, Qin Zhu, Rui Men, Ruize Gao, Shixuan Liu, Shuang Luo, Tianhao Li, Tianyi Tang, Wenbiao Yin, Xingzhang Ren, Xinyu Wang, Xinyu Zhang, Xuancheng Ren, Yang Fan, Yang Su, Yichang Zhang, Yinger Zhang, Yu Wan, Yuqiong Liu, Zekun Wang, Zeyu Cui, Zhenru Zhang, Zhipeng Zhou, and Zihan Qiu. Qwen3 technical report. Technical report, 2025. URL [https://arxiv.org/abs/2505.09388](https://arxiv.org/abs/2505.09388).
31. Deheng Ye, Zhao Liu, Mingfei Sun, Bei Shi, Peilin Zhao, Hao Wu, Hongsheng Yu, Shaojie Yang, Xipeng Wu, Qingwei Guo, and et al. Mastering complex control in moba games with deep reinforcement learning. *Proceedings of the AAAI Conference on Artificial Intelligence*, 340 (04):0 6672–6679, Apr. 2020. 10.1609/aaai.v34i04.6144. URL [https://ojs.aaai.org/index.php/AAAI/article/view/6144](https://ojs.aaai.org/index.php/AAAI/article/view/6144).
32. Chunting Zhou, Pengfei Liu, Puxin Xu, Srini Iyer, Jiao Sun, Yuning Mao, Xuezhe Ma, Avia Efrat, Ping Yu, LILI YU, Susan Zhang, Gargi Ghosh, Mike Lewis, Luke Zettlemoyer, and Omer Levy. LIMA: Less is more for alignment. In *Thirty-seventh Conference on Neural Information Processing Systems*, 2023. URL [https://openreview.net/forum?id=KBMOKmX2he](https://openreview.net/forum?id=KBMOKmX2he).
33. Andy Zou, Long Phan, Sarah Chen, James Campbell, Phillip Guo, Richard Ren, Alexander Pan, Xuwang Yin, Mantas Mazeika, Ann-Kathrin Dombrowski, Shashwat Goel, Nathaniel Li, Michael J. Byun, Zifan Wang, Alex Mallen, Steven Basart, Sanmi Koyejo, Dawn Song, Matt Fredrikson, J. Zico Kolter, and Dan Hendrycks. Representation engineering: A top-down approach to ai transparency, 2025. URL [https://arxiv.org/abs/2310.01405](https://arxiv.org/abs/2310.01405).
