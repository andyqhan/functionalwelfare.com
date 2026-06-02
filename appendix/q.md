# Q Training details

Table 28 reports our training configurations. Across all RL runs, we use LoRA rank 32, $\alpha$ 64, applied to `all-linear` modules; Dr. GRPO group size 64; 8 prompts per batch; 1024-token rollouts; 15-turn mazes with rewards $+20/-10/-0.1$; 10% wind; 10 rollouts per prompt; sampling temperature 0.7.

**Table 28.** Per-run hyperparameters for each checkpoint the body reports on. “Ent.” is the equalized entropy bonus regularization coefficient (Appendix J.3). “Step” is the checkpoint index used for concept vector extraction.

| Run | Algorithm | Base | LR | LoRA $r/\alpha$ | Ent. | Step | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4B Instruct Dr. GRPO (main) | Dr. GRPO | 4B-Ins | $3\text{e-}6$ | 32/64 | 0.01 | 95 | primary reference |
| 4B Instruct Dr. GRPO (swap) | Dr. GRPO | 4B-Ins | $3\text{e-}6$ | 32/64 | 0.01 | 50 | Mold$\leftrightarrow$Gold |
| 4B Base | Dr. GRPO | 4B-Base | $3\text{e-}5$ | 32/64 | 0 | 101 | no eq-ent bonus |
| 4B Base (shuffle) | Dr. GRPO | 4B-Base | $3\text{e-}5$ | 32/64 | 0 | 101 | 3-way permuted tiles |
| 8B Cardinal Dr. GRPO | Dr. GRPO | 8B | $3\text{e-}6$ | 32/64 | 0.05 | 65 | higher ent. coef. |
| 4B Instruct SFT | SFT | 4B-Ins | $2\text{e-}5$ | 32/64 | n/a | 9375 | 50k traj, 3 epochs |
| GPT-OSS-20B (Tinker) | Tinker GRPO | 20B | $3\text{e-}5$ | 32/32 | 0.01 | 160 | 11-turn, 512 tok |
| 4B Token REINFORCE | REINFORCE | 4B-Ins | $3\text{e-}6$ | 32/64 | 0.2 | 115 | high ent. for variance |
| 4B Instruct FFT SFT | SFT | 4B-Ins | $1\text{e-}5$ | n/a | n/a | 3125 | 50k traj, 1 epoch |
| 4B Instruct FFT RL | Dr. GRPO | 4B-Ins | $3\text{e-}6$ | n/a | 0.01 | 95 | group size 32; 32 prompts/batch |

## Q.1 Token-level REINFORCE

A possible worry with our results is that perhaps only Dr. GRPO recruits the functional welfare axis, rather than RL in general. We therefore train a model via token-level REINFORCE. While Dr. GRPO applies a single trajectory-level advantage to all tokens, token-level REINFORCE assigns each action its own per-position advantage built from a returns-to-go signal and a per-position group baseline.

#### Per-turn reward signal.

Each rollout produces a sequence of turns $t = 0, 1, \dots, T_{i} - 1$ for trajectory $i$. At every turn the agent emits a single direction token and the environment returns a scalar reward

$$
r_{i,t}\;=\; r_{\text{step}}\;+\; r_{\text{Gold}{}}\cdot \Delta g_{i,t}\;+\; r_{\text{Mold}{}}\cdot \Delta\ell_{i,t},
$$

where $\Delta g_{i,t}$ and $\Delta\ell_{i,t}$ are the number of Gold tiles consumed and Mold tiles entered on turn $t$ respectively, and the constants take the values $r_{\text{step}}= -0.1$, $r_{\text{Gold}{}}= +20$, $r_{\text{Mold}{}}= -10$ also used by Dr. GRPO.

#### Returns-to-go.

We use undiscounted returns-to-go ($\gamma = 1$):

$$
G_{i,t}\;=\; \sum_{k=t}^{T_i - 1}r_{i,k}.
$$

$G_{i,t}$ is the trajectory’s reward summed from the current turn through termination, so the action emitted at turn $t$ is credited with all downstream consequences of the policy’s choices from $t$ onward.

#### Per-position group baseline.

For every batch we sample $|\mathcal{G}|$ rollouts per maze prompt (the GRPO group). Within a group $g$, we let $\mathcal{G}$ for its index set and let $m_{i,t}\in \{0,1\}$ be the response mask (1 at valid turn positions, 0 at padding for trajectories that terminated before the maximum turn limit). The baseline at turn position $t$ is the mask-weighted mean return-to-go across that group’s still-active members,

$$
b^{(g)}_{t}\;=\; \frac{\sum_{i \in \mathcal{G}}m_{i,t}\, G_{i,t}}{\max\!\Bigl(\sum_{i \in \mathcal{G}}m_{i,t},\, 1\Bigr)},
$$

and the per-turn advantage is

$$
A_{i,t}\;=\; \bigl(G_{i,t}- b^{(g(i))}_{t}\bigr)\, m_{i,t}.
$$

#### Token-level PPO surrogate.

Following Ye et al. [31], we use a dual-clipping PPO variant. Let $\pi_{\theta}$ denote the current policy and $\pi_{\theta_{\text{old}}}$ the rollout-time policy. The importance ratio at turn $t$ of trajectory $i$ is

$$
\rho_{i,t}\;=\; \exp\!\bigl(\log \pi_{\theta}(a_{i,t}\mid s_{i,t}) - \log \pi_{\theta_{\text{old}}}(a_{i,t}\mid s_{i,t})\bigr),
$$

clamped in log-space to $[-20, 20]$ for numerical stability. We use the same dual-clip surrogate as Dr. GRPO, applied with per-turn advantages instead of trajectory advantages:

$$
L^{\text{clip}}_{i,t}\;=\; \begin{cases}\max\!\bigl(-\rho_{i,t}A_{i,t},\, -\bar\rho_{i,t}A_{i,t}\bigr)&\text{if }A_{i,t}\ge 0, \\[2pt] \min\!\bigl(\max(-\rho_{i,t}A_{i,t},\, -\bar\rho_{i,t}A_{i,t}),\, -c\, A_{i,t}\bigr)&\text{if }A_{i,t}< 0,\end{cases}
$$

where $\bar\rho_{i,t}= \mathrm{clip}(\rho_{i,t}, 1{-}\epsilon, 1{+}\epsilon)$, $\epsilon = 0.2$, and $c = 3.0$.

#### Differences from Dr. GRPO.

Token-level REINFORCE differs from our Dr. GRPO setup in three places:

1. the reward signal stored per turn ($r_{i,t}$ versus the end-of-trajectory return $R_{i} = \sum_{t} r_{i,t}$);
2. the advantage construction ($A_{i,t}= G_{i,t}- b^{(g)}_{t}$ versus $A_{i} = R_{i} - \bar R^{(g)}$, with no token-level credit assignment in Dr. GRPO);
3. the broadcast of advantages onto the surrogate (per-turn $A_{i,t}$ versus replicating $A_{i}$ across all turns).

 The clipped surrogate, KL penalty, equalized entropy bonus, normalization constant $Z$, optimizer, schedules, and rollout setup are identical between the two trainers.

Figure 43 shows the training signal for each row of Table 28.

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_4b_drgrpo.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_4b_drgrpo_office_swap.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_4b_base.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_4b_base_shuffle.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_8b_cardinal.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_4b_sft.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_tinker_v5.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_token_reinforce.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_instruct_fft.svg)

![Figure 43](https://functionalwelfare.com/paper/fig/appendix_training_curves__curves_pytorch_grpo_4b_fft.svg)

**Figure 43.** Training curves for every checkpoint listed in Table 28.
