namespace Aegis.DfsCalculator.Server.Data
{
    public class GGItems
    {
        public static List<GGItem> GG_ITEMS = new List<GGItem> {
            new GGItem { Id = "GG0130A", Label = "Eating", Domain = "selfCare" },
            new GGItem { Id = "GG0130B", Label = "Oral hygiene", Domain = "selfCare" },
            new GGItem { Id = "GG0130C", Label = "Toileting hygiene", Domain = "selfCare" },
            new GGItem { Id = "GG0130E", Label = "Shower/bathe self", Domain = "selfCare" },
            new GGItem { Id = "GG0130F", Label = "Upper body dressing", Domain = "selfCare" },
            new GGItem { Id = "GG0130G", Label = "Lower body dressing", Domain = "selfCare" },
            new GGItem { Id = "GG0130H", Label = "Put on/take off footwear", Domain = "selfCare" },
            new GGItem { Id = "GG0170A", Label = "Roll left and right", Domain = "mobility" },
            new GGItem { Id = "GG0170B", Label = "Sit to lying", Domain = "mobility" },
            new GGItem { Id = "GG0170C", Label = "Lying to sitting on bed side", Domain = "mobility" },
            new GGItem { Id = "GG0170D", Label = "Sit to stand", Domain = "mobility" },
            new GGItem { Id = "GG0170E", Label = "Chair/bed-to-chair transfer", Domain = "mobility" },
            new GGItem { Id = "GG0170F", Label = "Toilet transfer", Domain = "mobility" },
            new GGItem { Id = "GG0170G", Label = "Car transfer", Domain = "mobility" },
            new GGItem { Id = "GG0170I", Label = "Walk 10 feet", Domain = "mobility" },
            new GGItem { Id = "GG0170J", Label = "Walk 50 feet with two turns", Domain = "mobility" },
            new GGItem { Id = "GG0170K", Label = "Walk 150 feet", Domain = "mobility" },
            new GGItem { Id = "GG0170L", Label = "Walking 10 feet uneven surface", Domain = "mobility" },
            new GGItem { Id = "GG0170M", Label = "1 step (curb)", Domain = "mobility" },
            new GGItem { Id = "GG0170N", Label = "4 steps", Domain = "mobility" },
            new GGItem { Id = "GG0170O", Label = "12 steps", Domain = "mobility" },
            new GGItem { Id = "GG0170P", Label = "Picking up object", Domain = "mobility" },
            new GGItem { Id = "GG0170R", Label = "Wheel 50 feet with two turns", Domain = "mobility" },
            new GGItem { Id = "GG0170S", Label = "Wheel 150 feet", Domain = "mobility" }
        };
    }

    public class GGItem
    {
        public string Id { get; set; }
        public string Label { get; set; }
        public string Domain { get; set; }
    }
}