# M Comparison of concept vector norms

All of our steering interventions add a scalar multiple of a concept vector to the residual stream. The effective strength of a given $\alpha$ therefore depends on the $L^{2}$ norm of the vector being added, which varies. Table 27 reports those norms for the reward vectors.

**Table 27.** L2 norms of extracted concept vectors at their auto-selected steering layer. Controls are extracted once per underlying base model; ditto marks ( ” ) indicate a duplicate control shared with an earlier row on the same base model. Note that GPT-OSS-20B is in a different norm regime ($\sim 100$–1000) than the Qwen3 family ($\sim 4$–30).

| Checkpoint | Mold control | Gold control | Mold | Gold |
| --- | --- | --- | --- | --- |
| Qwen3 4B Instruct Dr. GRPO | 4.46 (L22) | 7.51 (L22) | 4.07 (L20) | 14.37 (L22) |
| Qwen3 4B Instruct Dr. GRPO (tiles swapped) | ” | ” | 3.79 (L21) | 10.85 (L22) |
| Qwen3 4B Instruct Dr. GRPO (FFT) | ” | ” | 3.70 (L21) | 9.87 (L22) |
| Qwen3 4B Instruct SFT | ” | ” | 19.71 (L22) | 19.54 (L22) |
| Qwen3 4B Instruct SFT (FFT) | ” | ” | 44.61 (L31) | 18.40 (L20) |
| Qwen3 4B Instruct REINFORCE | ” | ” | 5.79 (L20) | 27.09 (L24) |
| Qwen3 4B Base | 4.03 (L22) | 6.85 (L23) | 16.65 (L23) | 14.31 (L21) |
| Qwen3 4B Base (tiles swapped) | ” | ” | 16.12 (L22) | 13.28 (L21) |
| Qwen3 8B | 7.52 (L22) | 13.53 (L22) | 14.28 (L20) | 23.41 (L21) |
| GPT-OSS-20B Dr. GRPO | 149.08 (L16) | 343.70 (L17) | 991.65 (L16) | 442.13 (L14) |

## M.1 Norm-matching control-vector steering

The steering evaluations in §4 compare the trained reward vectors $\mathbf{v}_{c}$ against the maze-naive control concept vectors $\mathbf{u}_{c}$ extracted by the same pipeline (§2.3). Because $\mathbf{u}_{c}$ and $\mathbf{v}_{c}$ are extracted by the same pipeline from checkpoints that differ only in whether maze training has occurred, the controls isolate the contribution of maze training to the downstream steering effects. A random-direction baseline could rule out “any vector steers,” but $\mathbf{u}_{c}$ is a more targeted control: it additionally rules out artifacts of the extraction pipeline itself (e.g. the trajectory construction or the difference-in-means procedure) and of the emoji tokens’ pre-existing representations. Any steering effect present for $\mathbf{v}_{c}$ but absent for $\mathbf{u}_{c}$ is therefore attributable to how maze training reshaped the model’s representations of the rewarded tiles.

A concern is that the trained vectors and the controls generally have different $L^{2}$ norms (Table 27). We therefore *norm-match*: control vectors are steered with scaled factors $\beta$ chosen so that $\beta \lVert \mathbf{u}_{c} \rVert = \alpha \lVert \mathbf{v}_{c} \rVert$, so the residual-stream perturbation has the same magnitude at every nominal $\alpha$. In figures we plot the control vectors at their nominal $\alpha$ rather than the scaled $\beta$, so trained and control curves can be read against the same horizontal axis. This is the convention used wherever a trained reward vector is compared against a control in the body steering evaluations (§4); it is also reused for the maze-naive control comparisons in Appendix C, for the VAA comparison in Appendix H, and for the sentiment-subspace decomposition in Appendix F.5.

We do not renormalize the trained reward vectors themselves; their norms could be signals of representation strength.
