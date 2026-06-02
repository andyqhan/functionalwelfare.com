# I The axis tracks goals in the instruct model

The tracking results in §5 use Qwen3-4B-Base as the base model. Here we replicate all three tracking analyses on the Qwen3-4B-Instruct-2507 Dr. GRPO checkpoint and its maze-naive counterpart (Qwen3-4B-Instruct-2507), confirming that the tracking patterns persist in the instruct model.

## Maze goal tracking

![Figure 36](https://functionalwelfare.com/paper/fig/tikz__maze_trajectory_tracking__maze_trajectory_tracking.svg)

**Figure 36.** Density of projections at the last move token on Mold-final and Gold-final maze trajectories for the Qwen3-4B-Instruct-2507 model. Solid: maze-trained; dashed: maze-naive. As in the Base model (Figure 5), both vectors separate sharply on the maze-trained model but show little separation on the maze-naive model.

We observe the same qualitative pattern on the instruct model (Figure 36) as in the base model (Figure 5). Both vectors separate Gold-final from Mold-final trajectories on the maze-trained model but show little separation on the maze-naive model, confirming that the vectors track a goal that only the trained model possesses.

## Correctness tracking

![Figure 37](https://functionalwelfare.com/paper/fig/tikz__correctness_tracking__correctness_tracking.svg)

**Figure 37.** Density of projections at the generation-prompt position after truthful feedback on GSM8K and MMLU for the Qwen3-4B-Instruct-2507 model. Solid: maze-trained; dashed: maze-naive. As in the Base model (Figure 6), both vectors track correctness, with similar effects on maze-naive and maze-trained models.

We observe the same correctness-tracking pattern on the instruct model (Figure 37) as in the base model (Figure 6). On both GSM8K and MMLU, projection distributions separate correct from incorrect responses, with similar effects across maze-naive and maze-trained models.

## Confidence control

![Figure 38](https://functionalwelfare.com/paper/fig/tikz__correctness_tracking__mmlu_confidence_control.svg)

**Figure 38.** Density of projections onto MMLU response activations binned by confidence tertile for the Qwen3-4B-Instruct-2507 model. Solid: maze-trained; dashed: maze-naive. As in the Base model (Figure 7), correct and incorrect responses separate within each confidence bin, confirming that the axis tracks correctness beyond confidence alone.

We bin MMLU responses by normalized confidence $\text{P(True)}/ (\text{P(True)}+ \text{P(False)})$ into tertiles and check whether correctness tracking persists within each bin.

We observe that the vectors in the instruct model (Figure 38), as in the base model (Figure 7), separate correct and incorrect responses consistently within each P(True) tertile, confirming that the axis tracks correctness beyond confidence in the instruct model as well.
